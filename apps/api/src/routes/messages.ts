import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../plugins/db.js";
import { getRedis } from "../plugins/redis.js";
import { publishEvent, takeToken } from "../services/ratelimit.js";
import { escapeHtml } from "../services/sanitize.js";

const attachmentSchema = z.object({ url: z.string().max(2048).url(), name: z.string().max(255), contentType: z.string().max(100), sizeBytes: z.number().int().nonnegative().max(10 * 1024 * 1024) });
const msgSchema = z.object({ content: z.string().max(2000), attachments: z.array(attachmentSchema).max(3).optional() }).refine((value) => value.content.trim().length > 0 || Boolean(value.attachments?.length));

async function canReadChannel(channelId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT c.server_id AS "serverId", m.status FROM channels c
     LEFT JOIN server_members m ON m.server_id=c.server_id AND m.user_id=$2
     WHERE c.id=$1`,
    [channelId, userId],
  );
  return Boolean(rows[0] && (rows[0].serverId === null || rows[0].status === "member"));
}

export const messageRoutes: FastifyPluginAsync = async (app) => {
  // Keyset pagination: ?limit=&before=<createdAt,id>
  app.get("/channels/:id/messages", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const channelId = (req.params as { id: string }).id;
    if (!(await canReadChannel(channelId, uid))) return reply.code(403).send({ error: "not_a_server_member" });
    const q = req.query as { limit?: string; before?: string };
    const limit = Math.min(Math.max(Number(q.limit ?? 50), 1), 100);
    let rows;
    const SELECT_FLAT = `SELECT m.id, m.channel_id AS "channelId", m.author_id AS "authorId", m.content,
                m.created_at AS "createdAt", m.edited_at AS "editedAt", m.attachments,
                u.id AS "a_id", u.username AS "a_username", u.discriminator AS "a_disc", u.avatar_url AS "a_avatar"
         FROM messages m JOIN users u ON u.id=m.author_id`;
    if (q.before) {
      const [ts, mid] = q.before.split(",");
      ({ rows } = await pool.query(
        `${SELECT_FLAT} WHERE m.channel_id=$1 AND (m.created_at < $2 OR (m.created_at = $2 AND m.id < $3::bigint))
         ORDER BY m.created_at DESC, m.id DESC LIMIT $4`,
        [channelId, ts, mid, limit],
      ));
    } else {
      ({ rows } = await pool.query(
        `${SELECT_FLAT} WHERE m.channel_id=$1 ORDER BY m.created_at DESC, m.id DESC LIMIT $2`,
        [channelId, limit],
      ));
    }
    const items = rows.map((r) => ({
      id: String(r.id),
      channelId: String(r.channelId),
      authorId: String(r.authorId),
      content: r.content,
      attachments: r.attachments ?? [],
      createdAt: new Date(r.createdAt).toISOString(),
      editedAt: r.editedAt ? new Date(r.editedAt).toISOString() : null,
      author: { id: String(r.a_id), username: r.a_username, discriminator: r.a_disc, avatarUrl: r.a_avatar },
    }));
    const nextCursor = items.length === limit ? `${items[items.length - 1].createdAt},${items[items.length - 1].id}` : null;
    return { items: items.reverse(), nextCursor };
  });

  app.post("/channels/:id/messages", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const channelId = (req.params as { id: string }).id;
    if (!(await canReadChannel(channelId, uid))) return reply.code(403).send({ error: "not_a_server_member" });
    const redis = getRedis();
    if (redis) {
      const { allowed } = await takeToken(redis, `msg:${uid}`, 10, 10);
      if (!allowed) return reply.code(429).send({ error: "rate_limited" });
    }
    const body = msgSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const { rows } = await pool.query(
      `INSERT INTO messages (channel_id, author_id, content, attachments) VALUES ($1,$2,$3,$4)
       RETURNING id, channel_id AS "channelId", author_id AS "authorId", content, attachments, created_at AS "createdAt", edited_at AS "editedAt"`,
      [channelId, uid, escapeHtml(body.data.content), JSON.stringify(body.data.attachments ?? [])],
    );
    const message = rows[0];
    await publishEvent(redis, "message:create", { message });
    return { message };
  });

  app.patch("/messages/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const body = msgSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const { rows } = await pool.query(
      `UPDATE messages SET content=$1, edited_at=NOW() WHERE id=$2 AND author_id=$3
       RETURNING id, channel_id AS "channelId", author_id AS "authorId", content, edited_at AS "editedAt"`,
      [escapeHtml(body.data.content), (req.params as { id: string }).id, uid],
    );
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    await publishEvent(getRedis(), "message:update", { message: rows[0] });
    return { message: rows[0] };
  });

  app.delete("/messages/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const { rows } = await pool.query(`DELETE FROM messages WHERE id=$1 AND author_id=$2 RETURNING channel_id AS "channelId", id`, [(req.params as { id: string }).id, uid]);
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    await publishEvent(getRedis(), "message:delete", { channelId: rows[0].channelId, messageId: rows[0].id });
    return { ok: true };
  });

  app.post("/messages/:id/reactions", { preHandler: [app.authenticate] }, async (req) => {
    const uid = (req.user as { sub: string }).sub;
    const { emoji } = (req.body ?? {}) as { emoji?: string };
    await pool.query(
      `INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [(req.params as { id: string }).id, uid, String(emoji ?? "👍").slice(0, 16)],
    );
    return { ok: true };
  });

  // ---- friends & DMs ----
  app.get("/friends", { preHandler: [app.authenticate] }, async (req) => {
    const uid = (req.user as { sub: string }).sub;
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.discriminator, u.avatar_url AS "avatarUrl", f.status
       FROM friendships f JOIN users u ON u.id = CASE WHEN f.requester_id=$1 THEN f.addressee_id ELSE f.requester_id END
       WHERE f.requester_id=$1 OR f.addressee_id=$1`,
      [uid],
    );
    return { friends: rows };
  });

  app.post("/friends", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const { username } = (req.body ?? {}) as { username?: string };
    const target = await pool.query(`SELECT id FROM users WHERE username=$1`, [username]);
    if (!target.rows[0]) return reply.code(404).send({ error: "user_not_found" });
    await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending') ON CONFLICT DO NOTHING`,
      [uid, target.rows[0].id],
    );
    return { ok: true };
  });

  app.get("/dms/:userId/messages", { preHandler: [app.authenticate] }, async (req) => {
    const uid = (req.user as { sub: string }).sub;
    const other = (req.params as { userId: string }).userId;
    const { rows } = await pool.query(
      `SELECT id, sender_id AS "senderId", recipient_id AS "recipientId", content, attachments, created_at AS "createdAt"
       FROM direct_messages WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)
       ORDER BY created_at DESC LIMIT 50`,
      [uid, other],
    );
    return { items: rows.reverse() };
  });

  app.post("/dms/:userId/messages", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const other = (req.params as { userId: string }).userId;
    const body = msgSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const { rows } = await pool.query(
      `INSERT INTO direct_messages (sender_id, recipient_id, content, attachments) VALUES ($1,$2,$3,$4) RETURNING id, content, attachments, created_at AS "createdAt"`,
      [uid, other, escapeHtml(body.data.content), JSON.stringify(body.data.attachments ?? [])],
    );
    await publishEvent(getRedis(), "dm:create", { recipientId: other, message: rows[0] });
    return { message: rows[0] };
  });
};
