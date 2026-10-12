import type Redis from 'ioredis';

export type ClusterEvent =
  | { kind: 'message'; channel: string; payload: { channelId: string; message: unknown } }
  | { kind: 'presence'; channel: string; payload: { userId: string; status: string; at: number } }
  | { kind: 'typing'; channel: string; payload: { channelId: string; userId: string; at: number } }
  | { kind: 'voice'; channel: string; payload: { channelId: string; userId: string; state: unknown } }
  | { kind: 'voice_moderation'; channel: string; payload: { userId: string; serverId: string; voiceMuted?: boolean; soundMuted?: boolean } };

export type ClusterHandler = (evt: ClusterEvent) => void;

/**
 * Pub/Sub cluster-ready.
 * - Usa um client dedicado para subscribe (padrão ioredis) + psubscribe nos padrões:
 *   message:*, presence:*, typing:*, voice:*
 * - Publicadores podem usar qualquer client Redis (aqui: pub client).
 */
export class GatewayPubSub {
  private handler: ClusterHandler = () => undefined;

  constructor(
    private readonly sub: Redis,
    private readonly pub: Redis,
  ) {}

  onEvent(handler: ClusterHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    this.sub.on('pmessage', (_pattern: string, channel: string, raw: string) => {
      try {
        const payload = JSON.parse(raw) as unknown;
        if (channel.startsWith('message:')) {
          const channelId = channel.slice('message:'.length);
          this.handler({ kind: 'message', channel, payload: { channelId, message: payload } });
        } else if (channel.startsWith('presence:')) {
          this.handler({ kind: 'presence', channel, payload: payload as { userId: string; status: string; at: number } });
        } else if (channel.startsWith('typing:')) {
          this.handler({ kind: 'typing', channel, payload: payload as { channelId: string; userId: string; at: number } });
        } else if (channel.startsWith('voice:')) {
          if (channel === 'voice:moderation') {
            this.handler({ kind: 'voice_moderation', channel, payload: payload as { userId: string; serverId: string; voiceMuted?: boolean; soundMuted?: boolean } });
            return;
          }
          const channelId = channel.slice('voice:'.length);
          const p = payload as { userId: string; state: unknown };
          this.handler({ kind: 'voice', channel, payload: { channelId, userId: p.userId, state: p.state ?? p } });
        }
      } catch {
        // ignora mensagem malformada
      }
    });
    await this.sub.psubscribe('message:*', 'presence:*', 'typing:*', 'voice:*');
  }

  async publishMessage(channelId: string, message: unknown): Promise<void> {
    await this.pub.publish(`message:${channelId}`, JSON.stringify(message));
  }

  async publishPresence(userId: string, status: string): Promise<void> {
    await this.pub.publish(`presence:${userId}`, JSON.stringify({ userId, status, at: Date.now() }));
  }

  async publishTyping(channelId: string, userId: string): Promise<void> {
    await this.pub.publish(`typing:${channelId}`, JSON.stringify({ channelId, userId, at: Date.now() }));
  }

  async publishVoice(channelId: string, userId: string, state: unknown): Promise<void> {
    await this.pub.publish(`voice:${channelId}`, JSON.stringify({ userId, state }));
  }

  async stop(): Promise<void> {
    try {
      await this.sub.punsubscribe('message:*', 'presence:*', 'typing:*', 'voice:*');
    } catch {
      // noop
    }
  }
}
