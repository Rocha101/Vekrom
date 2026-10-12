import { WebSocketServer, WebSocket } from "ws";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { Op, parseEnvelope, SocketRateLimiter, type Envelope } from "./protocol.js";
import { SessionStore } from "./session.js";
import { PresenceManager, type PresenceStatus } from "./presence.js";
import { GatewayPubSub } from "./pubsub.js";
import { VoiceManager } from "./voice.js";
import { MemRedis } from "./memredis.js";

const PORT = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3002);
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-troque-em-producao";
const HEARTBEAT_INTERVAL = 30_000;

type AnyRedis = Redis;

async function connectRedis(): Promise<{ client: AnyRedis; sub: AnyRedis; mem: boolean }> {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const mk = () =>
    new Redis(url, { maxRetriesPerRequest: 1, retryStrategy: () => null, enableReadyCheck: false, lazyConnect: false });
  const client = mk();
  client.on("error", () => undefined);
  try {
    const pong = await Promise.race([
      client.ping(),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timeout")), 2000)),
    ]);
    if (pong === "PONG") {
      const sub = mk();
      sub.on("error", () => undefined);
      console.log("[gateway] redis conectado");
      return { client, sub, mem: false };
    }
    throw new Error("no pong");
  } catch {
    try {
      client.disconnect();
    } catch {
      /* noop */
    }
    console.log("[gateway] redis indisponível — usando MemRedis (modo sem Docker)");
    const mem = new MemRedis() as unknown as AnyRedis;
    const memSub = new MemRedis() as unknown as AnyRedis;
    return { client: mem, sub: memSub, mem: true };
  }
}

const { client: redis, sub: redisSub } = await connectRedis();

const sessions = new SessionStore();
const presence = new PresenceManager(redis, { onError: (e) => console.error("[presence]", e) });
const pubsub = new GatewayPubSub(redisSub, redis);
const voice = new VoiceManager();
const voiceModeration = new Map<string, { mute?: boolean; deaf?: boolean }>();

const wss = new WebSocketServer({ port: PORT, perMessageDeflate: true, maxPayload: 64 * 1024 });

let seq = 0;
function send(ws: WebSocket, op: Op, d: unknown, t?: string): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ op, d, s: ++seq, t: t ?? null }));
}

function broadcastAll(t: string, d: unknown): void {
  for (const s of sessions.all()) {
    if (s.identified) send(s.socket, Op.DISPATCH, d, t);
  }
}

// Fanout (Redis ou memória): distribui eventos para sockets locais.
pubsub.onEvent((evt) => {
  if (evt.kind === "message") {
    const p = evt.payload as { channelId?: string; message?: { channelId?: string } };
    const channelId = p.message?.channelId ?? p.channelId ?? "";
    const msg = (p as { message?: unknown }).message ?? p;
    const targets = sessions.subscribersOf(channelId);
    const list = targets.length > 0 ? targets : [...sessions.all()].filter((s) => s.identified);
    for (const s of list) send(s.socket, Op.DISPATCH, { message: msg }, "MESSAGE_CREATE");
  } else if (evt.kind === "presence") {
    const p = evt.payload as { userId: string; status: string };
    broadcastAll("PRESENCE_UPDATE", { presence: { userId: p.userId, status: p.status, lastSeenAt: new Date().toISOString() } });
  } else if (evt.kind === "typing") {
    broadcastAll("TYPING_START", evt.payload);
  } else if (evt.kind === "voice") {
    const p = evt.payload as { channelId: string; userId: string; state: unknown };
    const st = (p.state ?? {}) as Record<string, unknown>;
    broadcastAll("voice:update", { voiceState: { userId: p.userId, channelId: p.channelId, ...st } });
  } else if (evt.kind === "voice_moderation") {
    const { userId: targetId, voiceMuted, soundMuted } = evt.payload;
    const flags = voiceModeration.get(targetId) ?? {};
    if (voiceMuted !== undefined) flags.mute = voiceMuted ? true : undefined;
    if (soundMuted !== undefined) flags.deaf = soundMuted ? true : undefined;
    if (flags.mute === undefined && flags.deaf === undefined) voiceModeration.delete(targetId);
    else voiceModeration.set(targetId, flags);
    const channelId = voice.currentChannelOf(targetId);
    if (channelId) {
      const state = voice.setFlags(targetId, {
        ...(voiceMuted !== undefined ? { mute: voiceMuted } : {}),
        ...(soundMuted !== undefined ? { deaf: soundMuted } : {}),
      });
      if (state) broadcastAll("voice:update", { voiceState: state });
    }
    for (const session of sessions.all()) {
      if (session.identified && session.userId === targetId) {
        send(session.socket, Op.DISPATCH, { userId: targetId, voiceMuted, soundMuted }, "VOICE_MODERATION");
      }
    }
  }
});
await pubsub.start();

/** Compat: frontend envia {t,d}; protocolo nativo é {op,d}. Normaliza ambos. */
function normalize(raw: string): Envelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed === "object" && parsed !== null && typeof (parsed as { op?: unknown }).op === "number") {
    return parsed as Envelope;
  }
  if (typeof parsed === "object" && parsed !== null && typeof (parsed as { t?: unknown }).t === "string") {
    const { t, d } = parsed as { t: string; d?: unknown };
    const map: Record<string, Op> = {
      IDENTIFY: Op.IDENTIFY,
      HEARTBEAT: Op.HEARTBEAT,
      TYPING_START: Op.TYPING_START,
      PRESENCE_UPDATE: Op.PRESENCE_UPDATE,
      VOICE_STATE_UPDATE: Op.VOICE_STATE_UPDATE,
      VOICE_SIGNAL: Op.SIGNAL,
      MESSAGE_CREATE: Op.MESSAGE_CREATE,
    };
    const op = map[t];
    if (op === undefined) return null;
    return { op, d: d ?? {} };
  }
  return null;
}

function verifyToken(token: string): { sub: string | number; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; username: string };
  } catch {
    return null;
  }
}

wss.on("connection", (ws: WebSocket, req) => {
  const limiter = new SocketRateLimiter(20, 10);
  const connectionId = randomUUID();
  let userId: string | null = null;
  let username: string | null = null;
  let alive = true;

  send(ws, Op.HELLO, { heartbeat_interval: HEARTBEAT_INTERVAL });
  const hb = setInterval(() => {
    if (!alive) {
      clearInterval(hb);
      try {
        ws.terminate();
      } catch {
        /* noop */
      }
      return;
    }
    alive = false;
    try {
      ws.ping();
    } catch {
      /* noop */
    }
  }, HEARTBEAT_INTERVAL);
  ws.on("pong", () => {
    alive = true;
  });

  const doIdentify = (token: string, subscribe?: string[]) => {
    const payload = verifyToken(token);
    if (!payload) {
      send(ws, Op.DISPATCH, { code: 4002, message: "invalid token" }, "ERROR");
      ws.close(4002, "auth failed");
      return;
    }
    userId = String(payload.sub);
    username = String(payload.username ?? payload.sub);
    sessions.add({
      connectionId,
      userId,
      socket: ws,
      channels: new Set(subscribe ?? []),
      seq: 0,
      lastHeartbeat: Date.now(),
      identified: true,
    });
    presence.setStatus(userId, "online");
    send(ws, Op.DISPATCH, { user: { id: userId, username } }, "READY");
  };

  // Token via query string (cliente web envia ?token=)
  try {
    const u = new URL(req.url ?? "/", "http://local");
    const qToken = u.searchParams.get("token");
    if (qToken && verifyToken(qToken)) doIdentify(qToken);
  } catch {
    /* noop */
  }

  ws.on("message", async (raw) => {
    if (!limiter.tryConsume()) {
      send(ws, Op.DISPATCH, { code: 4009, message: "rate limited" }, "ERROR");
      return;
    }
    const normalized = normalize(raw.toString());
    if (!normalized) {
      send(ws, Op.DISPATCH, { code: 4000, message: "bad payload" }, "ERROR");
      return;
    }
    // Valida envelope nativo quando aplicável (compat {t,d} com content vazio passa direto)
    const { error } = parseEnvelope(JSON.stringify(normalized));
    if (error && normalized.op !== Op.HEARTBEAT) {
      // Compat: MESSAGE_CREATE sem content (relay) é permitido
      const isRelay =
        normalized.op === Op.MESSAGE_CREATE &&
        typeof normalized.d === "object" &&
        normalized.d !== null &&
        typeof (normalized.d as { channelId?: unknown }).channelId === "string";
      if (!isRelay) {
        send(ws, Op.DISPATCH, { code: 4000, message: error }, "ERROR");
        return;
      }
    }
    const env = normalized;

    if (env.op === Op.HEARTBEAT) {
      alive = true;
      const s = sessions.get(connectionId);
      if (s) s.lastHeartbeat = Date.now();
      if (userId) await presence.refresh(userId).catch(() => undefined);
      send(ws, Op.HEARTBEAT_ACK, { at: new Date().toISOString() }, "HEARTBEAT_ACK");
      return;
    }
    if (env.op === Op.IDENTIFY) {
      const { token, subscribe } = env.d as { token: string; subscribe?: string[] };
      doIdentify(token, subscribe);
      return;
    }
    if (!userId) {
      send(ws, Op.DISPATCH, { code: 4003, message: "identify first" }, "ERROR");
      return;
    }
    const uid = userId;

    if (env.op === Op.TYPING_START) {
      const { channelId } = env.d as { channelId: string };
      sessions.subscribe(connectionId, channelId);
      await presence.setTyping(channelId, uid).catch(() => undefined);
      await pubsub.publishTyping(channelId, uid).catch(() => undefined);
      broadcastAll("TYPING_START", { channelId, userId: uid, at: new Date().toISOString() });
    } else if (env.op === Op.PRESENCE_UPDATE) {
      const { status } = env.d as { status: PresenceStatus };
      if (status === "online" || status === "idle" || status === "dnd" || status === "offline") {
        presence.setStatus(uid, status);
        await pubsub.publishPresence(uid, status).catch(() => undefined);
        broadcastAll("PRESENCE_UPDATE", { presence: { userId: uid, status, lastSeenAt: new Date().toISOString() } });
      }
    } else if (env.op === Op.VOICE_STATE_UPDATE) {
      const { channelId, mute, deaf, speaking, camera, sharing } = env.d as {
        channelId: string | null;
        mute?: boolean;
        deaf?: boolean;
        speaking?: boolean;
        camera?: boolean;
        sharing?: boolean;
      };
      if (channelId === null) {
        const left = voice.leave(uid);
        if (left) {
          await pubsub.publishVoice(left.channelId, uid, { left: true }).catch(() => undefined);
          broadcastAll("voice:update", { voiceState: { userId: uid, channelId: null } });
        }
      } else {
        sessions.subscribe(connectionId, channelId);
        const enforced = voiceModeration.get(uid) ?? {};
        const state = voice.join(uid, channelId, { mute: enforced.mute ?? mute, deaf: enforced.deaf ?? deaf, camera, sharing });
        if (typeof speaking === "boolean") voice.setSpeaking(uid, speaking);
        else voice.setFlags(uid, { mute: enforced.mute ?? mute, deaf: enforced.deaf ?? deaf, camera, sharing });
        const cur = voice.participants(channelId).find((p) => p.userId === uid) ?? state;
        await pubsub.publishVoice(channelId, uid, cur).catch(() => undefined);
        broadcastAll("voice:update", { voiceState: { ...cur, channelId } });
        // Snapshot de quem já está no canal (permite ao recém-chegado ofertar WebRTC)
        send(ws, Op.DISPATCH, { channelId, members: voice.participants(channelId) }, "voice:members");
      }
    } else if (env.op === Op.SIGNAL) {
      const { to, data, scope } = env.d as { to: string; data: unknown; scope?: string };
      for (const cid of sessions.connectionsOfUser(to)) {
        const target = sessions.get(cid);
        if (target && target.identified && target.socket.readyState === WebSocket.OPEN) {
          send(target.socket, Op.DISPATCH, { from: uid, data, scope: scope ?? "cam" }, "voice:signal");
        }
      }
    } else if (env.op === Op.MESSAGE_CREATE) {
      const { channelId, content } = env.d as { channelId: string; content?: string };
      sessions.subscribe(connectionId, channelId);
      const message = {
        channelId,
        content: typeof content === "string" ? content : "",
        authorId: uid,
        author: { id: uid, username: username ?? uid },
        createdAt: new Date().toISOString(),
      };
      await pubsub.publishMessage(channelId, message).catch(() => undefined);
      // Relay local imediato (cobre modo sem Docker entre processos via REST+refetch no envio)
      for (const s of sessions.all()) {
        if (!s.identified || s.socket === ws) continue;
        if (s.channels.size === 0 || s.channels.has(channelId)) {
          send(s.socket, Op.DISPATCH, { message }, "MESSAGE_CREATE");
        }
      }
    }
  });

  ws.on("close", async () => {
    clearInterval(hb);
    sessions.remove(connectionId);
    if (userId) {
      await presence.markOffline(userId).catch(() => undefined);
      broadcastAll("PRESENCE_UPDATE", {
        presence: { userId, status: "offline", lastSeenAt: new Date().toISOString() },
      });
      voice.leave(userId);
    }
  });
});

console.log(`[gateway] listening on :${PORT}`);
