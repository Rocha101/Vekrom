import Redis from "ioredis";
import { MemRedis } from "./memredis.js";

// Em modo sem Docker o Redis pode não existir: tenta conexão rápida e,
// se falhar, usa MemRedis (em memória, mesma API usada pelo projeto).
const url = process.env.REDIS_URL ?? "redis://localhost:6379";

type AnyRedis = Redis;

let backing: AnyRedis;
let memMode = false;

async function connectWithTimeout(client: Redis, ms: number): Promise<boolean> {
  try {
    const pong = await Promise.race([
      client.ping(),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ]);
    return pong === "PONG";
  } catch {
    return false;
  }
}

async function boot(): Promise<AnyRedis> {
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
  client.on("error", () => undefined);
  if (await connectWithTimeout(client, 2000)) {
    console.log("[redis] conectado em", url);
    return client;
  }
  try {
    client.disconnect();
  } catch {
    /* noop */
  }
  memMode = true;
  console.log("[redis] indisponível — usando MemRedis (modo sem Docker)");
  return new MemRedis() as unknown as AnyRedis;
}

export const redis: AnyRedis = await boot();

export function getRedis(): AnyRedis {
  return redis;
}

export function isMemMode(): boolean {
  return memMode;
}

/** Publica evento para o gateway consumir (message:create, etc). */
export async function publish(channel: string, payload: unknown): Promise<void> {
  try {
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error("[redis] publish failed", channel, err);
  }
}

export async function redisHealth(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
