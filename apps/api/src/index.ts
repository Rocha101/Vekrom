import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { coreRoutes } from "./routes/servers.js";
import { messageRoutes } from "./routes/messages.js";
import { pool, dbHealth, initDb } from "./plugins/db.js";
import { redis, redisHealth } from "./plugins/redis.js";
import { sniffMime } from "./services/sanitize.js";
import { takeToken } from "./services/ratelimit.js";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const app = Fastify({ logger: true, bodyLimit: 12 * 1024 * 1024 });

await app.register(cors, { origin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(","), credentials: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 3 } });
await app.register(authPlugin);
await app.register(authRoutes);
await app.register(coreRoutes);
await app.register(messageRoutes);

app.get("/health", async () => ({ ok: true, db: await dbHealth(), redis: await redisHealth() }));

// Upload com validação de MIME real + limite
app.post("/upload", { preHandler: [app.authenticate] }, async (req, reply) => {
  const uid = (req.user as { sub: string }).sub;
  const { allowed } = await takeToken(redis, `upload:${uid}`, 10, 3600);
  if (!allowed) return reply.code(429).send({ error: "rate_limited" });
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: "no_file" });
  const chunks: Buffer[] = [];
  for await (const c of file.file) chunks.push(c as Buffer);
  const buf = Buffer.concat(chunks);
  const sniffed = sniffMime(buf.subarray(0, 16));
  const allowedMime = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "audio/wav", "audio/ogg", "audio/flac", "audio/mpeg", "audio/mp4"]);
  if (!sniffed || !allowedMime.has(sniffed)) return reply.code(415).send({ error: "invalid_type" });
  await mkdir("./uploads", { recursive: true });
  const extension: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "audio/wav": ".wav", "audio/ogg": ".ogg", "audio/flac": ".flac", "audio/mpeg": ".mp3", "audio/mp4": ".m4a" };
  const name = `${randomUUID()}${extension[sniffed]}`;
  await writeFile(`./uploads/${name}`, buf);
  const base = process.env.PUBLIC_UPLOAD_URL ?? "http://localhost:3001/files";
  return { url: `${base}/${name}`, contentType: sniffed, sizeBytes: buf.length, filename: file.filename };
});

app.get("/files/:name", async (req, reply) => {
  const name = (req.params as { name: string }).name;
  if (!/^[0-9a-f-]{36}\.(png|jpg|gif|webp|wav|ogg|flac|mp3|m4a)$/.test(name)) return reply.code(404).send({ error: "not_found" });
  try {
    const data = await readFile(`./uploads/${name}`);
    const mime = sniffMime(data.subarray(0, 16));
    if (!mime) return reply.code(415).send({ error: "invalid_type" });
    reply.header("Content-Type", mime).header("Cache-Control", "public, max-age=31536000, immutable").header("X-Content-Type-Options", "nosniff");
    return reply.send(data);
  } catch {
    return reply.code(404).send({ error: "not_found" });
  }
});

// Roles CRUD mínimo
app.get("/servers/:id/roles", { preHandler: [app.authenticate] }, async (req) => {
  const { rows } = await pool.query(`SELECT id, server_id AS "serverId", name, permissions, position, color FROM roles WHERE server_id=$1 ORDER BY position DESC`, [(req.params as { id: string }).id]);
  return { roles: rows };
});
app.post("/servers/:id/roles", { preHandler: [app.authenticate] }, async (req, reply) => {
  const uid = (req.user as { sub: string }).sub;
  const serverId = (req.params as { id: string }).id;
  const server = await pool.query(`SELECT owner_id FROM servers WHERE id=$1`, [serverId]);
  if (!server.rows[0]) return reply.code(404).send({ error: "server_not_found" });
  if (String(server.rows[0].owner_id) !== uid) return reply.code(403).send({ error: "owner_only" });
  const { name, permissions } = (req.body ?? {}) as { name?: string; permissions?: number };
  if (typeof permissions !== "number" || !Number.isInteger(permissions) || permissions < 0) return reply.code(400).send({ error: "invalid_permissions" });
  const { rows } = await pool.query(
    `INSERT INTO roles (server_id, name, permissions, position) VALUES ($1,$2,$3,(SELECT COALESCE(MAX(position),0)+1 FROM roles WHERE server_id=$1)) RETURNING id, name, permissions`,
    [serverId, String(name ?? "novo cargo").slice(0, 50), permissions],
  );
  return { role: rows[0] };
});
app.patch("/servers/:id/roles/:roleId", { preHandler: [app.authenticate] }, async (req, reply) => {
  const uid = (req.user as { sub: string }).sub;
  const { id: serverId, roleId } = req.params as { id: string; roleId: string };
  const body = (req.body ?? {}) as { name?: string; permissions?: number; color?: number | null };
  const server = await pool.query(`SELECT owner_id FROM servers WHERE id=$1`, [serverId]);
  if (!server.rows[0]) return reply.code(404).send({ error: "server_not_found" });
  if (String(server.rows[0].owner_id) !== uid) return reply.code(403).send({ error: "owner_only" });
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 50)) return reply.code(400).send({ error: "invalid_name" });
  if (body.permissions !== undefined && (!Number.isInteger(body.permissions) || body.permissions < 0)) return reply.code(400).send({ error: "invalid_permissions" });
  const { rows } = await pool.query(
    `UPDATE roles SET name=COALESCE($1,name), permissions=COALESCE($2,permissions), color=COALESCE($3,color)
     WHERE id=$4 AND server_id=$5 RETURNING id, name, permissions, color`,
    [body.name?.trim(), body.permissions, body.color, roleId, serverId],
  );
  if (!rows[0]) return reply.code(404).send({ error: "role_not_found" });
  return { role: rows[0] };
});
app.put("/servers/:id/roles/:roleId/members/:memberId", { preHandler: [app.authenticate] }, async (req, reply) => {
  const uid = (req.user as { sub: string }).sub;
  const { id: serverId, roleId, memberId } = req.params as { id: string; roleId: string; memberId: string };
  const server = await pool.query(`SELECT owner_id FROM servers WHERE id=$1`, [serverId]);
  if (!server.rows[0]) return reply.code(404).send({ error: "server_not_found" });
  if (String(server.rows[0].owner_id) !== uid) return reply.code(403).send({ error: "owner_only" });
  const { rows } = await pool.query(
    `INSERT INTO member_roles (server_id,user_id,role_id)
     SELECT $1,$2,r.id FROM roles r JOIN server_members m ON m.server_id=r.server_id AND m.user_id=$2 AND m.status='member'
     WHERE r.id=$3 AND r.server_id=$1 ON CONFLICT DO NOTHING RETURNING role_id`,
    [serverId, memberId, roleId],
  );
  if (!rows[0]) return reply.code(404).send({ error: "role_or_member_not_found" });
  return { ok: true };
});
app.delete("/servers/:id/roles/:roleId/members/:memberId", { preHandler: [app.authenticate] }, async (req, reply) => {
  const uid = (req.user as { sub: string }).sub;
  const { id: serverId, roleId, memberId } = req.params as { id: string; roleId: string; memberId: string };
  const server = await pool.query(`SELECT owner_id FROM servers WHERE id=$1`, [serverId]);
  if (!server.rows[0]) return reply.code(404).send({ error: "server_not_found" });
  if (String(server.rows[0].owner_id) !== uid) return reply.code(403).send({ error: "owner_only" });
  await pool.query(`DELETE FROM member_roles WHERE server_id=$1 AND role_id=$2 AND user_id=$3`, [serverId, roleId, memberId]);
  return { ok: true };
});

const port = Number(process.env.PORT ?? 3001);
await initDb();
app.listen({ port, host: "0.0.0.0" }).then(() => console.log(`[api] listening on :${port}`));
