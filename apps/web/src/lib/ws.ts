/**
 * Native WebSocket gateway client (no socket.io).
 * Features: heartbeat, exponential reconnect, inbound batching.
 */

export type GatewayEvent =
  | { t: 'MESSAGE_CREATE'; d: unknown }
  | { t: 'MESSAGE_UPDATE'; d: unknown }
  | { t: 'MESSAGE_DELETE'; d: { id: string; channelId: string } }
  | { t: 'PRESENCE_UPDATE'; d: unknown }
  | { t: 'TYPING_START'; d: { channelId: string; userId: string } }
  | { t: 'VOICE_STATE'; d: unknown }
  | { t: string; d: unknown };

type Handler = (evt: GatewayEvent) => void;

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'ws://localhost:3002/ws';

const HEARTBEAT_MS = 25_000;
const BATCH_WINDOW_MS = 120;
const MAX_BACKOFF_MS = 30_000;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private handlers = new Set<Handler>();
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private closedByUser = false;
  private batch: GatewayEvent[] = [];
  private batchTimer: number | null = null;

  connect(token: string): void {
    this.token = token;
    this.closedByUser = false;
    this.openSocket();
  }

  disconnect(): void {
    this.closedByUser = true;
    this.clearTimers();
    this.ws?.close(1000, 'client disconnect');
    this.ws = null;
  }

  send(type: string, data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: type, d: data }));
    }
  }

  subscribe(fn: Handler): () => void {
    this.handlers.add(fn);
    return () => {
      this.handlers.delete(fn);
    };
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private openSocket(): void {
    if (!this.token) return;
    const url = `${GATEWAY_URL}?token=${encodeURIComponent(this.token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.send('IDENTIFY', { token: this.token });
    };

    ws.onmessage = (msg: MessageEvent<string>) => {
      try {
        const evt = JSON.parse(msg.data) as GatewayEvent;
        if (evt.t === 'HELLO') {
          return;
        }
        this.enqueue(evt);
      } catch {
        /* ignore malformed */
      }
    };

    ws.onerror = () => {
      /* onclose will handle reconnect */
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      if (this.closedByUser) return;
      this.scheduleReconnect();
    };
  }

  private enqueue(evt: GatewayEvent): void {
    // Batch high-frequency events; dispatch low-frequency immediately.
    if (evt.t === 'MESSAGE_CREATE' || evt.t === 'PRESENCE_UPDATE') {
      this.batch.push(evt);
      if (this.batchTimer === null) {
        this.batchTimer = window.setTimeout(() => this.flush(), BATCH_WINDOW_MS);
      }
      return;
    }
    this.emit(evt);
  }

  private flush(): void {
    this.batchTimer = null;
    const items = this.batch.splice(0, this.batch.length);
    for (const evt of items) this.emit(evt);
  }

  private emit(evt: GatewayEvent): void {
    for (const h of this.handlers) {
      try {
        h(evt);
      } catch {
        /* handler error must not break gateway */
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send('HEARTBEAT', { at: Date.now() });
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    const backoff = Math.min(
      MAX_BACKOFF_MS,
      1000 * Math.pow(2, this.reconnectAttempts) + Math.random() * 500,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedByUser) this.openSocket();
    }, backoff);
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.batchTimer !== null) {
      window.clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

export const gateway = new GatewayClient();
