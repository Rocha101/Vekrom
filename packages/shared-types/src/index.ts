/**
 * @vekrom/shared-types — tipos canônicos do monorepo.
 * Fonte única de verdade para API, Gateway, Web e Media.
 */

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

export type Snowflake = string; // id estilo discord (bigint serializado como string)
export type ISODateString = string; // new Date().toISOString()

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User {
  id: Snowflake;
  username: string;
  discriminator: string; // ex: "0001"
  email: string;
  avatarUrl: string | null;
  bot: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type UserPublic = Omit<User, "email">;

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthPayload {
  sub: Snowflake; // user id
  username: string;
  iat: number;
  exp: number;
}

// ---------------------------------------------------------------------------
// Server (Guild)
// ---------------------------------------------------------------------------

export interface Server {
  id: Snowflake;
  name: string;
  iconUrl: string | null;
  ownerId: Snowflake;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateServerInput {
  name: string;
  iconUrl?: string | null;
}

export type MembershipStatus = "member" | "pending" | "banned";

export interface ServerMember {
  serverId: Snowflake;
  userId: Snowflake;
  nickname: string | null;
  joinedAt: ISODateString;
  status: MembershipStatus;
}

// ---------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------

export type ChannelType = "text" | "voice" | "announcement" | "dm" | "group_dm";

export interface Channel {
  id: Snowflake;
  serverId: Snowflake | null; // null => DM
  name: string;
  type: ChannelType;
  topic: string | null;
  position: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateChannelInput {
  serverId: Snowflake;
  name: string;
  type: ChannelType;
  topic?: string | null;
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export interface MessageAttachment {
  id: Snowflake;
  url: string;
  contentType: string;
  sizeBytes: number;
  filename: string;
}

export interface Message {
  id: Snowflake;
  channelId: Snowflake;
  authorId: Snowflake;
  content: string;
  attachments: MessageAttachment[];
  editedAt: ISODateString | null;
  createdAt: ISODateString;
  // denormalizado p/ leitura rápida (opcional)
  author?: UserPublic | null;
}

export interface CreateMessageInput {
  content: string;
  attachments?: MessageAttachment[];
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null; // cursor = `${created_at},${id}`
}

// ---------------------------------------------------------------------------
// Role + Permissions bitmask
// ---------------------------------------------------------------------------

export interface Role {
  id: Snowflake;
  serverId: Snowflake;
  name: string;
  /** bitmask de Permissions */
  permissions: number;
  position: number;
  color: number | null;
  createdAt: ISODateString;
}

export const Permissions = {
  ADMINISTRATOR: 1 << 0, // 1
  MANAGE_SERVER: 1 << 1, // 2
  MANAGE_CHANNELS: 1 << 2, // 4
  MANAGE_ROLES: 1 << 3, // 8
  MANAGE_MESSAGES: 1 << 4, // 16
  KICK_MEMBERS: 1 << 5, // 32
  BAN_MEMBERS: 1 << 6, // 64
  SEND_MESSAGES: 1 << 7, // 128
  READ_MESSAGES: 1 << 8, // 256
  CONNECT_VOICE: 1 << 9, // 512
  SPEAK: 1 << 10, // 1024
  ATTACH_FILES: 1 << 11, // 2048
} as const;

export type PermissionName = keyof typeof Permissions;

/** Retorna true se `held` contém `required`. ADMINISTRATOR concede tudo. */
export function hasPermission(held: number, required: number): boolean {
  if ((held & Permissions.ADMINISTRATOR) !== 0) return true;
  return (held & required) === required;
}

export function hasAnyPermission(held: number, ...required: number[]): boolean {
  if ((held & Permissions.ADMINISTRATOR) !== 0) return true;
  return required.some((p) => (held & p) === p);
}

export function grantPermission(held: number, grant: number): number {
  return held | grant;
}

export function revokePermission(held: number, revoke: number): number {
  return held & ~revoke;
}

// ---------------------------------------------------------------------------
// Friendships / DMs
// ---------------------------------------------------------------------------

export type FriendshipStatus = "pending" | "accepted" | "blocked";

export interface Friendship {
  id: Snowflake;
  requesterId: Snowflake;
  addresseeId: Snowflake;
  status: FriendshipStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DirectMessage {
  id: Snowflake;
  senderId: Snowflake;
  recipientId: Snowflake;
  content: string;
  createdAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Presence / Voice state
// ---------------------------------------------------------------------------

export type PresenceStatus = "online" | "idle" | "dnd" | "offline";

export interface Presence {
  userId: Snowflake;
  status: PresenceStatus;
  lastSeenAt: ISODateString;
}

export interface VoiceState {
  userId: Snowflake;
  channelId: Snowflake | null; // null => desconectado
  serverId: Snowflake | null;
  muted: boolean;
  deafened: boolean;
  selfVideo: boolean;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// WebSocket opcodes + payloads (Gateway)
// ---------------------------------------------------------------------------

export enum GatewayOpcode {
  IDENTIFY = 0,
  READY = 1,
  HEARTBEAT = 2,
  HEARTBEAT_ACK = 3,
  MESSAGE_CREATE = 4,
  MESSAGE_UPDATE = 5,
  MESSAGE_DELETE = 6,
  TYPING_START = 7,
  PRESENCE_UPDATE = 8,
  VOICE_STATE_UPDATE = 9,
  CHANNEL_CREATE = 10,
  CHANNEL_DELETE = 11,
  SERVER_MEMBER_ADD = 12,
  SERVER_MEMBER_REMOVE = 13,
  ERROR = 14,
}

export interface GatewayEnvelope<T = unknown> {
  op: GatewayOpcode;
  d: T;
  s?: number | null; // sequence (reservado)
  t?: string | null; // event name (reservado)
}

export interface IdentifyPayload {
  token: string;
}

export interface ReadyPayload {
  user: UserPublic;
  servers: Server[];
}

export interface HeartbeatPayload {
  at: ISODateString;
}

export interface MessageCreatePayload {
  message: Message;
}

export interface MessageUpdatePayload {
  message: Message;
}

export interface MessageDeletePayload {
  channelId: Snowflake;
  messageId: Snowflake;
}

export interface TypingStartPayload {
  channelId: Snowflake;
  userId: Snowflake;
  at: ISODateString;
}

export interface PresenceUpdatePayload {
  presence: Presence;
}

export interface VoiceStateUpdatePayload {
  voiceState: VoiceState;
}

export interface GatewayErrorPayload {
  code: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Validadores manuais (zod-like manual, sem dependência)
// Contrato: cada schema tem { parse(u): T, safeParse(u): {success,data?,error?} }
// ---------------------------------------------------------------------------

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function fail<T>(error: string): ValidationResult<T> {
  return { success: false, error };
}

function ok<T>(data: T): ValidationResult<T> {
  return { success: true, data };
}

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}

function isNonEmptyString(u: unknown): u is string {
  return typeof u === "string" && u.trim().length > 0;
}

export const CreateUserSchema = {
  parse(u: unknown): CreateUserInput {
    const r = this.safeParse(u);
    if (!r.success || !r.data) throw new Error(r.error ?? "invalid CreateUserInput");
    return r.data;
  },
  safeParse(u: unknown): ValidationResult<CreateUserInput> {
    if (!isRecord(u)) return fail("expected object");
    if (!isNonEmptyString(u["username"]) || (u["username"] as string).length > 32)
      return fail("username must be 1..32 chars");
    if (!isNonEmptyString(u["email"]) || !(u["email"] as string).includes("@"))
      return fail("email must be a valid email");
    if (typeof u["password"] !== "string" || (u["password"] as string).length < 8)
      return fail("password must be >= 8 chars");
    return ok({
      username: (u["username"] as string).trim(),
      email: (u["email"] as string).trim().toLowerCase(),
      password: u["password"] as string,
    });
  },
};

export const CreateMessageSchema = {
  parse(u: unknown): CreateMessageInput {
    const r = this.safeParse(u);
    if (!r.success || !r.data) throw new Error(r.error ?? "invalid CreateMessageInput");
    return r.data;
  },
  safeParse(u: unknown): ValidationResult<CreateMessageInput> {
    if (!isRecord(u)) return fail("expected object");
    if (typeof u["content"] !== "string" || (u["content"] as string).length > 2000)
      return fail("content must be string <= 2000 chars");
    if ((u["content"] as string).trim().length === 0 && u["attachments"] == null)
      return fail("content must not be empty");
    if (u["attachments"] != null && !Array.isArray(u["attachments"]))
      return fail("attachments must be an array");
    return ok({
      content: u["content"] as string,
      attachments: (u["attachments"] as MessageAttachment[] | undefined) ?? [],
    });
  },
};

export const CreateChannelSchema = {
  parse(u: unknown): CreateChannelInput {
    const r = this.safeParse(u);
    if (!r.success || !r.data) throw new Error(r.error ?? "invalid CreateChannelInput");
    return r.data;
  },
  safeParse(u: unknown): ValidationResult<CreateChannelInput> {
    if (!isRecord(u)) return fail("expected object");
    const validTypes: ChannelType[] = ["text", "voice", "announcement", "dm", "group_dm"];
    if (!isNonEmptyString(u["serverId"])) return fail("serverId required");
    if (!isNonEmptyString(u["name"])) return fail("name required");
    if (!validTypes.includes(u["type"] as ChannelType)) return fail("invalid channel type");
    return ok({
      serverId: u["serverId"] as string,
      name: (u["name"] as string).trim(),
      type: u["type"] as ChannelType,
      topic: (u["topic"] as string | null | undefined) ?? null,
    });
  },
};

export const CreateServerSchema = {
  parse(u: unknown): CreateServerInput {
    const r = this.safeParse(u);
    if (!r.success || !r.data) throw new Error(r.error ?? "invalid CreateServerInput");
    return r.data;
  },
  safeParse(u: unknown): ValidationResult<CreateServerInput> {
    if (!isRecord(u)) return fail("expected object");
    if (!isNonEmptyString(u["name"]) || (u["name"] as string).length > 100)
      return fail("name must be 1..100 chars");
    return ok({
      name: (u["name"] as string).trim(),
      iconUrl: (u["iconUrl"] as string | null | undefined) ?? null,
    });
  },
};
