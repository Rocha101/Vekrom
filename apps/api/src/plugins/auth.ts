import bcrypt from "bcryptjs";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export interface AccessPayload {
  sub: string;
  username: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessPayload;
    user: AccessPayload;
  }
}

export const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Gera refresh token opaco (armazenado com hash SHA-256 no banco). */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(48).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshCookieOptions() {
  const days = Number(process.env.JWT_REFRESH_TTL_DAYS ?? "30");
  return {
    path: "/auth",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: days * 24 * 60 * 60,
  };
}

const authPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-troque-em-producao",
    sign: { expiresIn: ACCESS_TTL },
    cookie: { cookieName: "accessToken", signed: false },
  });

  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      await reply.code(401).send({ error: "unauthorized" });
    }
  });
};

export default fp(authPlugin);
