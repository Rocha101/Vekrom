import type { WebSocket } from 'ws';

/** Sessão de um socket autenticado. */
export interface Session {
  connectionId: string;
  userId: string;
  socket: WebSocket;
  channels: Set<string>;
  seq: number;
  lastHeartbeat: number;
  identified: boolean;
}

/**
 * Store em memória (por instância) de sessões.
 * Cluster-ready: presença/canais "quentes" ficam no Redis (presence.ts / pubsub.ts);
 * aqui guardamos apenas sockets locais para broadcast direcionado.
 */
export class SessionStore {
  private byConnection = new Map<string, Session>();
  private byUser = new Map<string, Set<string>>();

  add(session: Session): void {
    this.byConnection.set(session.connectionId, session);
    let set = this.byUser.get(session.userId);
    if (!set) {
      set = new Set();
      this.byUser.set(session.userId, set);
    }
    set.add(session.connectionId);
  }

  remove(connectionId: string): Session | undefined {
    const s = this.byConnection.get(connectionId);
    if (!s) return undefined;
    this.byConnection.delete(connectionId);
    const set = this.byUser.get(s.userId);
    if (set) {
      set.delete(connectionId);
      if (set.size === 0) this.byUser.delete(s.userId);
    }
    return s;
  }

  get(connectionId: string): Session | undefined {
    return this.byConnection.get(connectionId);
  }

  /** Todos os connectionIds de um usuário (multi-device). */
  connectionsOfUser(userId: string): string[] {
    return [...(this.byUser.get(userId) ?? [])];
  }

  /** Sockets locais inscritos num canal de texto. */
  subscribersOf(channelId: string): Session[] {
    const out: Session[] = [];
    for (const s of this.byConnection.values()) {
      if (s.identified && s.channels.has(channelId)) out.push(s);
    }
    return out;
  }

  subscribe(connectionId: string, channelId: string): void {
    this.byConnection.get(connectionId)?.channels.add(channelId);
  }

  unsubscribe(connectionId: string, channelId: string): void {
    this.byConnection.get(connectionId)?.channels.delete(channelId);
  }

  /** Todas as sessões locais (para broadcast de presença/voz). */
  all(): Iterable<Session> {
    return this.byConnection.values();
  }

  get size(): number {
    return this.byConnection.size;
  }
}
