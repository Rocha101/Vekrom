/**
 * Protocolo JSON do gateway: { op, d, s?, t? }
 * opcodes inspirados em Discord Gateway (numéricos).
 */

/** Client -> Server e Server -> Client opcodes */
export enum Op {
  /** Server -> Client: evento roteado (t = nome do evento) */
  DISPATCH = 0,
  /** Client -> Server: heartbeat (d = seq ou null) */
  HEARTBEAT = 1,
  /** Client -> Server: autenticação inicial */
  IDENTIFY = 2,
  /** Client -> Server / DISPATCH: status de presença */
  PRESENCE_UPDATE = 3,
  /** Client -> Server / DISPATCH: estado de voz */
  VOICE_STATE_UPDATE = 4,
  /** Client -> Server / DISPATCH: digitando */
  TYPING_START = 5,
  /** Client -> Server / DISPATCH: nova mensagem */
  MESSAGE_CREATE = 6,
  /** Server -> Client: boas-vindas (d.heartbeat_interval) */
  HELLO = 10,
  /** Server -> Client: ack de heartbeat */
  HEARTBEAT_ACK = 11,
  /** Bidirecional: sinalização WebRTC (SDP/ICE) roteada para um usuário */
  SIGNAL = 12,
}

export interface Envelope<T = unknown> {
  op: Op;
  d: T;
  s?: number | null;
  t?: string | null;
}

export interface IdentifyPayload {
  token: string;
  /** canais de texto que o cliente quer ouvir (opcional, pode subscrever depois) */
  subscribe?: string[];
}

export interface MessageCreatePayload {
  channelId: string;
  content: string;
  nonce?: string;
  authorId?: string; // preenchido pelo servidor a partir do JWT
}

export interface TypingStartPayload {
  channelId: string;
}

export interface PresenceUpdatePayload {
  status: 'online' | 'idle' | 'offline';
}

export interface VoiceStateUpdatePayload {
  channelId: string | null; // null = sair de voz
  mute?: boolean;
  deaf?: boolean;
  speaking?: boolean;
}

export interface HelloPayload {
  heartbeat_interval: number;
}

export const MAX_PAYLOAD_BYTES = 64 * 1024; // 64KB
export const MAX_CONTENT_LENGTH = 2000;
export const MAX_CHANNEL_ID_LENGTH = 64;
export const MAX_SUBSCRIPTIONS = 100;

const VALID_STATUSES = new Set(['online', 'idle', 'dnd', 'offline']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidChannelId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_CHANNEL_ID_LENGTH && /^[A-Za-z0-9:_-]+$/.test(v);
}

/** Valida envelope bruto. Retorna erro legível ou null se ok. */
export function validateEnvelope(raw: unknown): string | null {
  if (!isRecord(raw)) return 'payload must be an object';
  const { op, d } = raw as { op?: unknown; d?: unknown };
  if (typeof op !== 'number' || !Object.values(Op).includes(op as Op)) return 'invalid op';
  if (d === undefined) return 'missing d';

  switch (op as Op) {
    case Op.IDENTIFY: {
      if (!isRecord(d)) return 'IDENTIFY d must be object';
      if (typeof (d as Record<string, unknown>).token !== 'string') return 'IDENTIFY token must be string';
      const sub = (d as Record<string, unknown>).subscribe;
      if (sub !== undefined) {
        if (!Array.isArray(sub) || sub.length > MAX_SUBSCRIPTIONS) return 'IDENTIFY subscribe invalid';
        for (const c of sub) if (!isValidChannelId(c)) return 'IDENTIFY subscribe channelId invalid';
      }
      return null;
    }
    case Op.MESSAGE_CREATE: {
      if (!isRecord(d)) return 'MESSAGE_CREATE d must be object';
      const r = d as Record<string, unknown>;
      if (!isValidChannelId(r.channelId)) return 'MESSAGE_CREATE channelId invalid';
      if (typeof r.content !== 'string' || r.content.length === 0 || r.content.length > MAX_CONTENT_LENGTH)
        return 'MESSAGE_CREATE content invalid (1..2000 chars)';
      return null;
    }
    case Op.TYPING_START: {
      if (!isRecord(d)) return 'TYPING_START d must be object';
      if (!isValidChannelId((d as Record<string, unknown>).channelId)) return 'TYPING_START channelId invalid';
      return null;
    }
    case Op.PRESENCE_UPDATE: {
      if (!isRecord(d)) return 'PRESENCE_UPDATE d must be object';
      const s = (d as Record<string, unknown>).status;
      if (typeof s !== 'string' || !VALID_STATUSES.has(s)) return 'PRESENCE_UPDATE status invalid';
      return null;
    }
    case Op.VOICE_STATE_UPDATE: {
      if (!isRecord(d)) return 'VOICE_STATE_UPDATE d must be object';
      const r = d as Record<string, unknown>;
      if (r.channelId !== null && !isValidChannelId(r.channelId)) return 'VOICE_STATE_UPDATE channelId invalid';
      return null;
    }
    case Op.SIGNAL: {
      if (!isRecord(d)) return 'SIGNAL d must be object';
      const r = d as Record<string, unknown>;
      if (typeof r.to !== 'string' || r.to.length === 0 || r.to.length > MAX_CHANNEL_ID_LENGTH)
        return 'SIGNAL to invalid';
      if (!isRecord(r.data)) return 'SIGNAL data must be object';
      if (r.scope !== undefined && r.scope !== 'cam' && r.scope !== 'screen') return 'SIGNAL scope invalid';
      return null;
    }
    case Op.HEARTBEAT:
      return null; // d pode ser seq number ou null
    default:
      return null;
  }
}

export function parseEnvelope(text: string | Buffer): { envelope?: Envelope; error?: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.toString());
  } catch {
    return { error: 'invalid JSON' };
  }
  const err = validateEnvelope(raw);
  if (err) return { error: err };
  return { envelope: raw as Envelope };
}

/** Rate-limit por socket: token bucket simples. */
export class SocketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens = 20,
    private readonly refillPerSec = 10,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /** Retorna true se pode consumir 1 token, false se excedeu. */
  tryConsume(cost = 1): boolean {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillPerSec);
    this.lastRefill = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}

export function dispatch<T>(event: string, data: T, seq: number): Envelope<T> {
  return { op: Op.DISPATCH, d: data, s: seq, t: event };
}
