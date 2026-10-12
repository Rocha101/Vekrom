import type { Redis } from "ioredis";

/** Sliding-window rate limit por chave. Retorna true se permitido. */
export async function takeToken(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const k = `rl:${key}`;
  const pipe = redis.pipeline();
  pipe.zremrangebyscore(k, 0, windowStart);
  pipe.zadd(k, now, `${now}:${Math.random().toString(36).slice(2)}`);
  pipe.zcard(k);
  pipe.expire(k, windowSec + 1);
  const res = await pipe.exec();
  const count = (res?.[2]?.[1] as number) ?? 0;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function publishEvent(redis: Redis | null, channel: string, payload: unknown): Promise<void> {
  if (!redis) return;
  try {
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error("[pubsub] publish failed", err);
  }
}
