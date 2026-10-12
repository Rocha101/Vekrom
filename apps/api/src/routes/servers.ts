import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../plugins/db.js";
import { getRedis } from "../plugins/redis.js";
import { publishEvent, takeToken } from "../services/ratelimit.js";
import { escapeHtml } from "../services/sanitize.js";

const serverSchema = z.object({ name: z.string().min(1).max(100), iconUrl: z.string().nullable().optional() });
const channelSchema = z.object({ name: z.string().min(1).max(100), type: z.enum(["text", "voice", "announcement"]).default("text"), topic: z.string().max(1024).nullable().optional() });
const moderationPermissionBits = { voice_mute: 1 << 10, sound_mute: 1 << 11, kick: 1 << 12, ban: 1 << 13 } as const;

export const coreRoutes: FastifyPluginAsync = async (app) => {
  // ---- servers ----
  app.get("/servers", { preHandler: [app.authenticate] }, async (req) => {
    const uid = (req.user as { sub: string }).sub;
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.icon_url AS "iconUrl", s.owner_id AS "ownerId", s.created_at AS "createdAt"
       FROM servers s JOIN server_members m ON m.server_id=s.id WHERE m.user_id=$1 AND m.status='member' ORDER BY s.created_at`,
      [uid],
    );
    return { servers: rows };
  });

  app.post("/servers", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const redis = getRedis();
    if (redis) {
      const { allowed } = await takeToken(redis, `server:create:${uid}`, 5, 3600);
      if (!allowed) return reply.code(429).send({ error: "rate_limited" });
    }
    const body = serverSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const s = await client.query(
        `INSERT INTO servers (name, owner_id, icon_url) VALUES ($1,$2,$3) RETURNING id, name, icon_url AS "iconUrl", owner_id AS "ownerId"`,
        [escapeHtml(body.data.name.trim()), uid, body.data.iconUrl ?? null],
      );
      await client.query(`INSERT INTO server_members (server_id, user_id, status) VALUES ($1,$2,'member')`, [s.rows[0].id, uid]);
      await client.query(
        `INSERT INTO channels (server_id, name, type, position) VALUES ($1,'geral','text',0),($1,'Voz Geral','voice',1)`,
        [s.rows[0].id],
      );
      await client.query(
        `INSERT INTO roles (server_id, name, permissions, position, color) VALUES ($1,'admin',1,100,3447003),($1,'@everyone',384,0,NULL)`,
        [s.rows[0].id],
      );
      await client.query("COMMIT");
      return { server: s.rows[0] };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });

  app.get("/servers/:id/channels", { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await pool.query(
      `SELECT id, server_id AS "serverId", name, type, topic, position FROM channels WHERE server_id=$1 ORDER BY position`,
      [(req.params as { id: string }).id],
    );
    return { channels: rows };
  });

  app.post("/servers/:id/channels", { preHandler: [app.authenticate] }, async (req, reply) => {
    const serverId = (req.params as { id: string }).id;
    const body = channelSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const { rows } = await pool.query(
      `INSERT INTO channels (server_id, name, type, topic, position) VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(position),-1)+1 FROM channels WHERE server_id=$1))
       RETURNING id, server_id AS "serverId", name, type, topic, position`,
      [serverId, body.data.name.trim().toLowerCase().replace(/\s+/g, "-"), body.data.type, body.data.topic ?? null],
    );
    await publishEvent(getRedis(), "channel:create", { serverId, channel: rows[0] });
    return { channel: rows[0] };
  });

  app.get("/servers/:id/members", { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.discriminator, u.avatar_url AS "avatarUrl", m.nickname, m.joined_at AS "joinedAt", m.voice_muted AS "voiceMuted", m.sound_muted AS "soundMuted"
       FROM server_members m JOIN users u ON u.id=m.user_id WHERE m.server_id=$1 AND m.status='member' ORDER BY u.username LIMIT 200`,
      [(req.params as { id: string }).id],
    );
    return { members: rows };
  });

  // Moderação administrativa: o servidor valida o dono no banco; permissão visual no cliente não basta.
  app.post("/servers/:id/members/:memberId/moderation", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ownerId = (req.user as { sub: string }).sub;
    const { id: serverId, memberId } = req.params as { id: string; memberId: string };
    const body = z.object({ action: z.enum(["kick", "ban", "voice_mute", "sound_mute"]), enabled: z.boolean().optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    if (ownerId === memberId) return reply.code(400).send({ error: "cannot_moderate_owner" });
    const server = await pool.query(`SELECT owner_id AS "ownerId" FROM servers WHERE id=$1`, [serverId]);
    if (!server.rows[0]) return reply.code(404).send({ error: "server_not_found" });
    const isOwner = String(server.rows[0].ownerId) === ownerId;
    if (String(server.rows[0].ownerId) === memberId) return reply.code(403).send({ error: "cannot_moderate_server_owner" });
    if (!isOwner) {
      const requiredBit = moderationPermissionBits[body.data.action];
      const roles = await pool.query(
        `SELECT r.permissions FROM member_roles mr JOIN roles r ON r.id=mr.role_id AND r.server_id=mr.server_id
         WHERE mr.server_id=$1 AND mr.user_id=$2`,
        [serverId, ownerId],
      );
      const allowed = roles.rows.some((role) => (Number(role.permissions) & requiredBit) === requiredBit);
      if (!allowed) return reply.code(403).send({ error: "missing_moderation_permission" });
    }
    const target = await pool.query(`SELECT status FROM server_members WHERE server_id=$1 AND user_id=$2`, [serverId, memberId]);
    if (!target.rows[0] || target.rows[0].status !== "member") return reply.code(404).send({ error: "member_not_found" });

    const { action, enabled = true } = body.data;
    if (action === "kick") {
      await pool.query(`DELETE FROM server_members WHERE server_id=$1 AND user_id=$2`, [serverId, memberId]);
    } else if (action === "ban") {
      await pool.query(`UPDATE server_members SET status='banned' WHERE server_id=$1 AND user_id=$2`, [serverId, memberId]);
    } else {
      const column = action === "voice_mute" ? "voice_muted" : "sound_muted";
      await pool.query(`UPDATE server_members SET ${column}=$1 WHERE server_id=$2 AND user_id=$3`, [enabled, serverId, memberId]);
      await publishEvent(getRedis(), "voice:moderation", {
        userId: memberId,
        serverId,
        voiceMuted: action === "voice_mute" ? enabled : undefined,
        soundMuted: action === "sound_mute" ? enabled : undefined,
      });
    }
    return { ok: true, action, enabled };
  });

  app.post("/servers/:id/join", { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = (req.user as { sub: string }).sub;
    const serverId = (req.params as { id: string }).id;
    const { rows } = await pool.query(
      `INSERT INTO server_members (server_id, user_id, status) VALUES ($1,$2,'member')
       ON CONFLICT (server_id, user_id) DO UPDATE SET status='member' WHERE server_members.status <> 'banned'
       RETURNING user_id`,
      [serverId, uid],
    );
    if (!rows[0]) return reply.code(403).send({ error: "banned_from_server" });
    return { ok: true };
  });

  app.post("/servers/:id/leave", { preHandler: [app.authenticate] }, async (req) => {
    const uid = (req.user as { sub: string }).sub;
    await pool.query(`DELETE FROM server_members WHERE server_id=$1 AND user_id=$2`, [(req.params as { id: string }).id, uid]);
    return { ok: true };
  });

  // ---- users ----
  app.patch("/users/@me", { preHandler: [app.authenticate] }, async (req) => {
    const uid = (req.user as { sub: string }).sub;
    const body = z.object({ username: z.string().min(2).max(32).optional(), avatarUrl: z.string().max(512).nullable().optional() }).safeParse(req.body);
    if (!body.success) return { ok: false };
    if (body.data.username) await pool.query(`UPDATE users SET username=$1 WHERE id=$2`, [escapeHtml(body.data.username), uid]);
    if (body.data.avatarUrl !== undefined) await pool.query(`UPDATE users SET avatar_url=$1 WHERE id=$2`, [body.data.avatarUrl, uid]);
    return { ok: true };
  });
};
