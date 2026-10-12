import type Redis from 'ioredis';

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline';

const PRESENCE_KEY = (userId: string) => `presence:${userId}`;
const TYPING_KEY = (channelId: string, userId: string) => `typing:${channelId}:${userId}`;

const PRESENCE_TTL_SEC = 60; // renovado a cada heartbeat/status
const TYPING_TTL_SEC = 6;

/**
 * Presença + typing em Redis com TTL e batching de 100ms.
 * - setStatus() enfileira e faz flush em pipeline a cada 100ms (evita N roundtrips).
 * - typing usa SET com EX (auto-expira) e publica evento via pub/sub.
 */
export class PresenceManager {
  private statusQueue = new Map<string, PresenceStatus>();
  private flushTimer: NodeJS.Timeout;
  private onFlushError: (err: unknown) => void;

  constructor(
    private readonly redis: Redis,
    opts?: { batchMs?: number; onError?: (err: unknown) => void },
  ) {
    this.onFlushError = opts?.onError ?? (() => undefined);
    this.flushTimer = setInterval(() => {
      void this.flush().catch((e) => this.onFlushError(e));
    }, opts?.batchMs ?? 100);
    this.flushTimer.unref?.();
  }

  /** Enfileira status (flush em batch). Também publica imediatamente no flush. */
  setStatus(userId: string, status: PresenceStatus): void {
    this.statusQueue.set(userId, status);
  }

  /** Força flush imediato (útil em disconnect). */
  async flushNow(): Promise<void> {
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.statusQueue.size === 0) return;
    const entries = [...this.statusQueue.entries()];
    this.statusQueue.clear();
    const pipe = this.redis.pipeline();
    for (const [userId, status] of entries) {
      if (status === 'offline') {
        pipe.del(PRESENCE_KEY(userId));
      } else {
        pipe.set(PRESENCE_KEY(userId), status, 'EX', PRESENCE_TTL_SEC);
      }
      pipe.publish(`presence:${userId}`, JSON.stringify({ userId, status, at: Date.now() }));
    }
    await pipe.exec();
  }

  async getStatus(userId: string): Promise<PresenceStatus> {
    const v = await this.redis.get(PRESENCE_KEY(userId));
    return v === 'online' || v === 'idle' || v === 'dnd' ? v : 'offline';
  }

  /** Marca typing com TTL curto. Retorna true se foi a primeira marca (para publicar). */
  async setTyping(channelId: string, userId: string): Promise<boolean> {
    const key = TYPING_KEY(channelId, userId);
    const first = (await this.redis.set(key, String(Date.now()), 'EX', TYPING_TTL_SEC, 'NX')) === 'OK';
    if (first) {
      await this.redis.publish(
        `typing:${channelId}`,
        JSON.stringify({ channelId, userId, at: Date.now() }),
      );
    }
    return first;
  }

  /** Renova TTL de presença (chamado a cada heartbeat). */
  async refresh(userId: string): Promise<void> {
    await this.redis.expire(PRESENCE_KEY(userId), PRESENCE_TTL_SEC);
  }

  async markOffline(userId: string): Promise<void> {
    this.statusQueue.set(userId, 'offline');
    await this.flush();
  }

  close(): void {
    clearInterval(this.flushTimer);
  }
}
