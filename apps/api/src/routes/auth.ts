import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../plugins/db.js";
import { getRedis } from "../plugins/redis.js";
import { hashPassword, verifyPassword, generateRefreshToken, hashToken, refreshCookieOptions } from "../plugins/auth.js";
import { takeToken } from "../services/ratelimit.js";
import { escapeHtml } from "../services/sanitize.js";

const registerSchema = z.object({ username: z.string().min(2).max(32), email: z.string().email(), password: z.string().min(8) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/register", async (req, reply) => {
    const redis = getRedis();
    if (redis) {
      const ip = req.ip;
      const { allowed } = await takeToken(redis, `register:${ip}`, 10, 3600);
      if (!allowed) return reply.code(429).send({ error: "rate_limited" });
    }
    const body = registerSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const { username, email, password } = body.data;
    const discriminator = String(Math.floor(Math.random() * 9000) + 1000);
    const passwordHash = await hashPassword(password);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (username, discriminator, email, password_hash) VALUES ($1,$2,$3,$4)
         RETURNING id, username, discriminator, email, avatar_url AS "avatarUrl", created_at AS "createdAt"`,
        [escapeHtml(username.trim()), discriminator, email.toLowerCase(), passwordHash],
      );
      const user = rows[0];
      const token = app.jwt.sign({ sub: user.id, username: user.username });
      const { token: refresh, tokenHash } = generateRefreshToken();
      await pool.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + INTERVAL '30 days')`, [user.id, tokenHash]);
      reply.setCookie("refreshToken", refresh, { ...refreshCookieOptions(), path: "/" });
      return { user, token };
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "23505") return reply.code(409).send({ error: "email_in_use" });
      throw e;
    }
  });

  app.post("/auth/login", async (req, reply) => {
    const redis = getRedis();
    if (redis) {
      const { allowed } = await takeToken(redis, `login:${req.ip}`, 20, 600);
      if (!allowed) return reply.code(429).send({ error: "rate_limited" });
    }
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const { rows } = await pool.query(`SELECT * FROM users WHERE email=$1`, [body.data.email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await verifyPassword(body.data.password, user.password_hash)))
      return reply.code(401).send({ error: "invalid_credentials" });
    const token = app.jwt.sign({ sub: user.id, username: user.username });
    const { token: refresh, tokenHash } = generateRefreshToken();
    await pool.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + INTERVAL '30 days')`, [user.id, tokenHash]);
    reply.setCookie("refreshToken", refresh, { ...refreshCookieOptions(), path: "/" });
    return { user: { id: user.id, username: user.username, discriminator: user.discriminator, email: user.email, avatarUrl: user.avatar_url }, token };
  });

  app.post("/auth/refresh", async (req, reply) => {
    const raw = req.cookies.refreshToken;
    if (!raw) return reply.code(401).send({ error: "no_refresh" });
    const { rows } = await pool.query(`SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash=$1`, [hashToken(raw)]);
    const row = rows[0];
    if (!row || new Date(row.expires_at) < new Date()) return reply.code(401).send({ error: "expired" });
    await pool.query(`DELETE FROM refresh_tokens WHERE token_hash=$1`, [hashToken(raw)]);
    const u = await pool.query(`SELECT id, username FROM users WHERE id=$1`, [row.user_id]);
    const token = app.jwt.sign({ sub: u.rows[0].id, username: u.rows[0].username });
    const { token: refresh, tokenHash } = generateRefreshToken();
    await pool.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + INTERVAL '30 days')`, [row.user_id, tokenHash]);
    reply.setCookie("refreshToken", refresh, { ...refreshCookieOptions(), path: "/" });
    return { token };
  });

  app.post("/auth/logout", async (req, reply) => {
    const raw = req.cookies.refreshToken;
    if (raw) await pool.query(`DELETE FROM refresh_tokens WHERE token_hash=$1`, [hashToken(raw)]);
    reply.clearCookie("refreshToken", { path: "/" });
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await pool.query(`SELECT id, username, discriminator, email, avatar_url AS "avatarUrl" FROM users WHERE id=$1`, [(req.user as { sub: string }).sub]);
    return { user: rows[0] ?? null };
  });
};
