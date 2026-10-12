const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? "http://localhost:3001";

export interface Server { id: string; name: string; iconUrl: string | null; ownerId: string; createdAt: string; description?: string; }
export interface Channel { id: string; serverId: string | null; name: string; type: string; topic: string | null; position: number; isPrivate?: boolean; userLimit?: number; }
export interface ChatAttachment { url: string; name: string; contentType: string; sizeBytes: number; }
export interface ChatMessage { id: string; channelId: string; authorId: string; content: string; createdAt: string; editedAt: string | null; attachments?: ChatAttachment[]; author?: { id: string; username: string } | null; }
export interface Friend {
  id: string;
  friendshipId: string;
  username: string;
  discriminator: string;
  avatarUrl: string | null;
  status: "accepted" | "pending" | "blocked";
  direction: "incoming" | "outgoing" | null;
}
export interface DirectMessage { id: string | number; senderId: string; recipientId: string; content: string; createdAt: string; attachments?: ChatAttachment[]; }

function token(): string | null { return localStorage.getItem("vekrom:token"); }

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...(init.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) {
    let detail = "";
    try { detail = String((await res.json() as { error?: string }).error ?? ""); } catch { /* response may not be JSON */ }
    throw new Error(detail || `API ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: { id: string; username: string } }> {
    return req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  async register(username: string, email: string, password: string): Promise<{ token: string; user: { id: string; username: string } }> {
    return req("/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) });
  },
  servers(): Promise<Server[]> {
    return req<{ servers: Server[] }>("/servers").then((r) => r.servers);
  },
  createServer(name: string): Promise<{ server: Server }> {
    return req("/servers", { method: "POST", body: JSON.stringify({ name }) });
  },
  leaveServer(id: string): Promise<unknown> {
    return req(`/servers/${id}/leave`, { method: "POST" });
  },
  channels(serverId: string): Promise<Channel[]> {
    return req<{ channels: Channel[] }>(`/servers/${serverId}/channels`).then((r) => r.channels);
  },
  createChannel(serverId: string, name: string): Promise<unknown> {
    return req(`/servers/${serverId}/channels`, { method: "POST", body: JSON.stringify({ name }) });
  },
  members(serverId: string): Promise<Array<{ id: string; username: string; nickname: string | null; avatarUrl: string | null; voiceMuted: boolean; soundMuted: boolean }>> {
    return req<{ members: Array<{ id: string; username: string; nickname: string | null; avatarUrl: string | null; voiceMuted: boolean; soundMuted: boolean }> }>(`/servers/${serverId}/members`).then((r) => r.members);
  },
  moderateMember(serverId: string, memberId: string, action: "kick" | "ban" | "voice_mute" | "sound_mute", enabled = true): Promise<{ ok: boolean }> {
    return req(`/servers/${serverId}/members/${memberId}/moderation`, { method: "POST", body: JSON.stringify({ action, enabled }) });
  },
  messages(channelId: string, before?: string): Promise<{ items: ChatMessage[]; nextCursor: string | null }> {
    const q = before ? `?before=${encodeURIComponent(before)}&limit=50` : "?limit=50";
    return req(`/channels/${channelId}/messages${q}`);
  },
  sendMessage(channelId: string, content: string, attachments: ChatAttachment[] = []): Promise<unknown> {
    return req(`/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify({ content: content || " ", attachments: attachments.filter((attachment) => !attachment.url.startsWith("data:")) }) });
  },
  deleteMessage(id: string): Promise<unknown> {
    return req(`/messages/${id}`, { method: "DELETE" });
  },
  updateMe(data: { username?: string; avatarUrl?: string | null }): Promise<{ ok: boolean }> {
    return req("/users/@me", { method: "PATCH", body: JSON.stringify(data) });
  },
  async uploadAvatar(file: File): Promise<{ url: string; contentType: string; sizeBytes: number }> {
    return this.uploadFile(file);
  },
  async uploadFile(file: File): Promise<{ url: string; contentType: string; sizeBytes: number; filename?: string }> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new Error(`Upload ${res.status}`);
    return res.json();
  },
  friends(): Promise<Friend[]> {
    return req<{ friends: Friend[] }>("/friends").then((r) => r.friends);
  },
  addFriend(username: string): Promise<unknown> {
    return req("/friends", { method: "POST", body: JSON.stringify({ username }) });
  },
  acceptFriendRequest(friendshipId: string): Promise<{ ok: boolean }> {
    return req(`/friends/${encodeURIComponent(friendshipId)}/accept`, { method: "POST" });
  },
  removeFriendRequest(friendshipId: string): Promise<{ ok: boolean }> {
    return req(`/friends/${encodeURIComponent(friendshipId)}`, { method: "DELETE" });
  },
  directMessages(userId: string): Promise<DirectMessage[]> {
    return req<{ items: DirectMessage[] }>(`/dms/${encodeURIComponent(userId)}/messages`).then((r) => r.items);
  },
  sendDirectMessage(userId: string, content: string, attachments: ChatAttachment[] = []): Promise<DirectMessage> {
    return req<{ message: DirectMessage }>(`/dms/${encodeURIComponent(userId)}/messages`, { method: "POST", body: JSON.stringify({ content: content || " ", attachments: attachments.filter((attachment) => !attachment.url.startsWith("data:")) }) }).then((r) => r.message);
  },
};

export { API_BASE };
