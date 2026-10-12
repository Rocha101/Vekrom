import { create } from "zustand";
import type { SocialUser, StreamerProfile } from "./lib/types";
import type { ChatAttachment } from "./lib/api";

// Move saved client data to the new Vekrom namespace without logging users out.
if (typeof localStorage !== "undefined") {
  try {
    const oldPrefix = "concord:";
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const oldKey = localStorage.key(index);
      if (!oldKey?.startsWith(oldPrefix)) continue;
      const newKey = `vekrom:${oldKey.slice(oldPrefix.length)}`;
      if (localStorage.getItem(newKey) === null) {
        const value = localStorage.getItem(oldKey);
        if (value !== null) localStorage.setItem(newKey, value);
      }
      localStorage.removeItem(oldKey);
    }
  } catch {
    // Storage can be unavailable in private browsing; the app still starts.
  }
}

interface AuthState {
  token: string | null;
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string;
  pronouns: string;
  bannerColor: string;
  login: (t: string, uid: string, un: string) => void;
  logout: () => void;
  updateProfile: (data: {
    username?: string;
    avatarUrl?: string | null;
    bio?: string;
    pronouns?: string;
    bannerColor?: string;
  }) => void;
}

const storedToken = localStorage.getItem("vekrom:token");
const storedUserId = localStorage.getItem("vekrom:uid");
const storedUsername = localStorage.getItem("vekrom:username");
const storedDemoSession = Boolean(storedToken?.startsWith("demo_token") || storedUserId === "usr_demo");
if (storedDemoSession) {
  localStorage.removeItem("vekrom:token");
  localStorage.removeItem("vekrom:uid");
  localStorage.removeItem("vekrom:username");
}

export const useAuth = create<AuthState>((set) => ({
  token: storedDemoSession ? null : storedToken,
  userId: storedDemoSession ? null : storedUserId,
  username: storedDemoSession ? null : storedUsername,
  avatarUrl: localStorage.getItem("vekrom:avatar") || null,
  bio: localStorage.getItem("vekrom:bio") || "",
  pronouns: localStorage.getItem("vekrom:pronouns") || "",
  bannerColor: localStorage.getItem("vekrom:bannerColor") || "from-slate-900 via-indigo-950 to-slate-900",
  login: (t, uid, un) => {
    localStorage.setItem("vekrom:token", t);
    localStorage.setItem("vekrom:uid", uid);
    localStorage.setItem("vekrom:username", un);
    set({ token: t, userId: uid, username: un });
  },
  logout: () => {
    localStorage.removeItem("vekrom:token");
    localStorage.removeItem("vekrom:uid");
    localStorage.removeItem("vekrom:username");
    localStorage.removeItem("vekrom:avatar");
    localStorage.removeItem("vekrom:bio");
    localStorage.removeItem("vekrom:pronouns");
    localStorage.removeItem("vekrom:bannerColor");
    set({ token: null, userId: null, username: null, avatarUrl: null, bio: "", pronouns: "", bannerColor: "from-slate-900 via-indigo-950 to-slate-900" });
  },
  updateProfile: (data) => {
    if (data.username !== undefined) localStorage.setItem("vekrom:username", data.username);
    if (data.avatarUrl !== undefined) {
      if (data.avatarUrl) localStorage.setItem("vekrom:avatar", data.avatarUrl);
      else localStorage.removeItem("vekrom:avatar");
    }
    if (data.bio !== undefined) localStorage.setItem("vekrom:bio", data.bio);
    if (data.pronouns !== undefined) localStorage.setItem("vekrom:pronouns", data.pronouns);
    if (data.bannerColor !== undefined) localStorage.setItem("vekrom:bannerColor", data.bannerColor);
    set((s) => ({
      username: data.username ?? s.username,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : s.avatarUrl,
      bio: data.bio !== undefined ? data.bio : s.bio,
      pronouns: data.pronouns !== undefined ? data.pronouns : s.pronouns,
      bannerColor: data.bannerColor !== undefined ? data.bannerColor : s.bannerColor,
    }));
  },
}));

export type PresenceStatus = "online" | "idle" | "dnd" | "offline";

interface PresenceState {
  status: PresenceStatus;
  customText: string;
  setStatus: (status: PresenceStatus) => void;
  setCustomText: (text: string) => void;
}

const storedStatus = (localStorage.getItem("vekrom:status") as PresenceStatus | null) || "online";
const VALID_STATUS: PresenceStatus[] = ["online", "idle", "dnd", "offline"];

export const usePresence = create<PresenceState>((set) => ({
  status: VALID_STATUS.includes(storedStatus) ? storedStatus : "online",
  customText: localStorage.getItem("vekrom:customStatus") || "",
  setStatus: (status) => {
    localStorage.setItem("vekrom:status", status);
    set({ status });
  },
  setCustomText: (customText) => {
    localStorage.setItem("vekrom:customStatus", customText);
    set({ customText });
  },
}));

export const PRESENCE_META: Record<PresenceStatus, { label: string; dot: string }> = {
  online: { label: "Disponível", dot: "bg-emerald-500" },
  idle: { label: "Ausente", dot: "bg-amber-400" },
  dnd: { label: "Não perturbe", dot: "bg-rose-500" },
  offline: { label: "Invisível", dot: "bg-zinc-500" },
};

export type MobileTab = "home" | "social" | "search" | "streams" | "profile";

interface UIState {
  serverId: string | null;
  channelId: string | null;
  showMembers: boolean;
  showChannels: boolean;
  mobileTab: MobileTab;
  selectedDmUser: SocialUser | null;
  activeStreamer: StreamerProfile | null;
  setServer: (id: string | null) => void;
  setChannel: (id: string | null) => void;
  toggleMembers: () => void;
  toggleChannels: () => void;
  setMobileTab: (tab: MobileTab) => void;
  setSelectedDmUser: (user: SocialUser | null) => void;
  setActiveStreamer: (streamer: StreamerProfile | null) => void;
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  serverId: null,
  channelId: null,
  showMembers: false,
  showChannels: false,
  mobileTab: "social",
  selectedDmUser: null,
  activeStreamer: null,
  setServer: (serverId) => set({ serverId, channelId: null, selectedDmUser: null }),
  setChannel: (channelId) => set({ channelId, showChannels: false, selectedDmUser: null }),
  toggleMembers: () => set((s) => ({ showMembers: !s.showMembers })),
  toggleChannels: () => set((s) => ({ showChannels: !s.showChannels })),
  setMobileTab: (tab) => set({ mobileTab: tab }),
  setSelectedDmUser: (user) => set({ selectedDmUser: user }),
  setActiveStreamer: (streamer) => set({ activeStreamer: streamer }),
  shareModalOpen: false,
  setShareModalOpen: (shareModalOpen) => set({ shareModalOpen }),
}));

import {
  playJoinCallSound,
  playLeaveCallSound,
  playMuteSound,
  playUnmuteSound,
  playDeafenSound,
  playUndeafenSound,
} from "./lib/sounds";

interface VoiceState {
  channelId: string | null;
  muted: boolean;
  deafened: boolean;
  video: boolean;
  sharing: boolean;
  speaking: Set<string>;
  join: (id: string) => void;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setVideo: (v: boolean) => void;
  setSharing: (v: boolean) => void;
}

export const useVoice = create<VoiceState>((set) => ({
  channelId: null,
  muted: false,
  deafened: false,
  video: false,
  sharing: false,
  speaking: new Set(),
  join: (channelId) => {
    playJoinCallSound();
    set({ channelId });
  },
  leave: () => {
    playLeaveCallSound();
    set({ channelId: null, video: false, sharing: false });
  },
  toggleMute: () =>
    set((s) => {
      const nextMuted = !s.muted;
      if (nextMuted) {
        playMuteSound();
      } else {
        playUnmuteSound();
      }
      return { muted: nextMuted };
    }),
  toggleDeafen: () =>
    set((s) => {
      const nextDeafened = !s.deafened;
      if (nextDeafened) {
        playDeafenSound();
      } else {
        playUndeafenSound();
      }
      return { deafened: nextDeafened };
    }),
  setVideo: (video) => set({ video }),
  setSharing: (sharing) => set({ sharing }),
}));

/* ---------- Server & Channel Management Store ---------- */
export interface ServerModel {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  createdAt: string;
  description?: string;
}

export interface ChannelModel {
  id: string;
  serverId: string;
  name: string;
  type: string;
  topic: string | null;
  position: number;
  isPrivate?: boolean;
  userLimit?: number;
}

export interface ServerRole {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  permissions: {
    viewChannels: boolean;
    viewPrivateChannels: boolean;
    manageChannels: boolean;
    manageRoles: boolean;
    manageServer: boolean;
    manageMessages: boolean;
    connect: boolean;
    kickMembers: boolean;
    banMembers: boolean;
    muteMembers: boolean;
    deafenMembers: boolean;
  };
  memberIds: string[];
}

export function defaultServerRole(): ServerRole {
  return {
    id: "everyone", name: "Permissões padrão", color: "#9ca3af", isDefault: true, memberIds: [],
    permissions: { viewChannels: true, viewPrivateChannels: false, manageChannels: false, manageRoles: false, manageServer: false, manageMessages: false, connect: true, kickMembers: false, banMembers: false, muteMembers: false, deafenMembers: false },
  };
}

export interface MessageModel {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  author?: { id: string; username: string } | null;
  attachments?: ChatAttachment[];
}

function loadStoredServers(): ServerModel[] {
  try {
    const s = localStorage.getItem("vekrom:servers_list");
    if (s) {
      const servers = (JSON.parse(s) as ServerModel[]).filter((server) => !["srv_val", "srv_ow", "srv_dev"].includes(server.id));
      localStorage.setItem("vekrom:servers_list", JSON.stringify(servers));
      return servers;
    }
  } catch {}
  return [];
}

function loadStoredChannels(): Record<string, ChannelModel[]> {
  try {
    const c = localStorage.getItem("vekrom:channels_map");
    if (c) {
      const channels = JSON.parse(c) as Record<string, ChannelModel[]>;
      for (const id of ["srv_val", "srv_ow", "srv_dev"]) delete channels[id];
      localStorage.setItem("vekrom:channels_map", JSON.stringify(channels));
      return channels;
    }
  } catch {}
  return {};
}

function loadStoredMessages(): Record<string, MessageModel[]> {
  try {
    const m = localStorage.getItem("vekrom:messages_map");
    if (m) {
      const messages = JSON.parse(m) as Record<string, MessageModel[]>;
      delete messages.ch_val_gen;
      for (const [channelId, channelMessages] of Object.entries(messages)) {
        messages[channelId] = channelMessages.filter((message) => !["m_seed_1", "m_seed_2"].includes(message.id));
      }
      localStorage.setItem("vekrom:messages_map", JSON.stringify(messages));
      return messages;
    }
  } catch {}
  return {};
}

interface ServerStoreState {
  servers: ServerModel[];
  channelsMap: Record<string, ChannelModel[]>;
  messagesMap: Record<string, MessageModel[]>;
  addServer: (name: string, iconUrl?: string | null) => { server: ServerModel; defaultChannel: ChannelModel };
  addChannel: (serverId: string, name: string, type: "text" | "voice") => ChannelModel;
  updateChannel: (serverId: string, channelId: string, data: Partial<Pick<ChannelModel, "name" | "isPrivate" | "userLimit">>) => void;
  deleteChannel: (serverId: string, channelId: string) => void;
  rolesMap: Record<string, ServerRole[]>;
  createRole: (serverId: string, name: string) => ServerRole;
  updateRole: (serverId: string, roleId: string, data: Partial<Pick<ServerRole, "name" | "color" | "permissions" | "memberIds">>) => void;
  deleteRole: (serverId: string, roleId: string) => void;
  toggleRoleMember: (serverId: string, roleId: string, memberId: string) => void;
  deleteServer: (serverId: string) => void;
  leaveServerLocal: (serverId: string) => void;
  updateServer: (serverId: string, data: Partial<Pick<ServerModel, "name" | "iconUrl" | "description">>) => void;
  addMessage: (channelId: string, content: string, username: string, attachments?: ChatAttachment[]) => MessageModel;
}

export const useServerStore = create<ServerStoreState>((set, get) => ({
  servers: loadStoredServers(),
  channelsMap: loadStoredChannels(),
  messagesMap: loadStoredMessages(),
  rolesMap: (() => { try { return JSON.parse(localStorage.getItem("vekrom:server_roles") || "{}"); } catch { return {}; } })(),

  createRole: (serverId, name) => {
    const current = get().rolesMap[serverId] ?? [defaultServerRole()];
    const role: ServerRole = { id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: name.trim(), color: "#5865f2", memberIds: [], permissions: { ...defaultServerRole().permissions } };
    const rolesMap = { ...get().rolesMap, [serverId]: [...current, role] };
    localStorage.setItem("vekrom:server_roles", JSON.stringify(rolesMap));
    set({ rolesMap });
    return role;
  },

  updateRole: (serverId, roleId, data) => {
    const current = get().rolesMap[serverId] ?? [defaultServerRole()];
    const rolesMap = { ...get().rolesMap, [serverId]: current.map((role) => {
      if (role.id !== roleId) return role;
      if (role.isDefault) return { ...role, permissions: data.permissions ? { ...role.permissions, ...data.permissions } : role.permissions };
      return { ...role, ...data, permissions: data.permissions ? { ...role.permissions, ...data.permissions } : role.permissions };
    }) };
    localStorage.setItem("vekrom:server_roles", JSON.stringify(rolesMap));
    set({ rolesMap });
  },

  deleteRole: (serverId, roleId) => {
    const current = get().rolesMap[serverId] ?? [defaultServerRole()];
    const rolesMap = { ...get().rolesMap, [serverId]: current.filter((role) => role.id !== roleId || role.isDefault) };
    localStorage.setItem("vekrom:server_roles", JSON.stringify(rolesMap));
    set({ rolesMap });
  },

  toggleRoleMember: (serverId, roleId, memberId) => {
    const current = get().rolesMap[serverId] ?? [defaultServerRole()];
    const rolesMap = { ...get().rolesMap, [serverId]: current.map((role) => {
      if (role.id !== roleId || role.isDefault) return role;
      const memberIds = role.memberIds.includes(memberId) ? role.memberIds.filter((id) => id !== memberId) : [...role.memberIds, memberId];
      return { ...role, memberIds };
    }) };
    localStorage.setItem("vekrom:server_roles", JSON.stringify(rolesMap));
    set({ rolesMap });
  },

  addServer: (name, iconUrl = null) => {
    const newServerId = "srv_" + Date.now();
    const newServer: ServerModel = {
      id: newServerId,
      name,
      iconUrl: iconUrl || null,
      ownerId: "me",
      createdAt: new Date().toISOString(),
    };

    // Exactly as requested: automatically create ONLY one text channel called "Chat geral"
    const newChannelId = "ch_" + Date.now();
    const defaultChannel: ChannelModel = {
      id: newChannelId,
      serverId: newServerId,
      name: "Chat geral",
      type: "text",
      topic: "Canal inicial de texto da sua comunidade",
      position: 0,
    };

    const updatedServers = [...get().servers, newServer];
    const updatedChannels = {
      ...get().channelsMap,
      [newServerId]: [defaultChannel],
    };
    const updatedMessages = get().messagesMap;

    try {
      localStorage.setItem("vekrom:servers_list", JSON.stringify(updatedServers));
      localStorage.setItem("vekrom:channels_map", JSON.stringify(updatedChannels));
    } catch {}

    set({
      servers: updatedServers,
      channelsMap: updatedChannels,
      messagesMap: updatedMessages,
    });

    return { server: newServer, defaultChannel };
  },

  addChannel: (serverId, name, type) => {
    const newChannelId = "ch_" + Date.now();
    const newChannel: ChannelModel = {
      id: newChannelId,
      serverId,
      name,
      type,
      topic: null,
      position: (get().channelsMap[serverId]?.length || 0),
    };

    const currentChannels = get().channelsMap[serverId] || [];
    const updatedChannels = {
      ...get().channelsMap,
      [serverId]: [...currentChannels, newChannel],
    };

    try {
      localStorage.setItem("vekrom:channels_map", JSON.stringify(updatedChannels));
    } catch {}

    set({ channelsMap: updatedChannels });
    return newChannel;
  },

  updateChannel: (serverId, channelId, data) => {
    const serverChannels = get().channelsMap[serverId] || [];
    if (!serverChannels.some((channel) => channel.id === channelId)) throw new Error("Canal não encontrado. Reabra as configurações e tente novamente.");
    const updatedChannels = { ...get().channelsMap, [serverId]: serverChannels.map((channel) => channel.id === channelId ? { ...channel, ...data } : channel) };
    localStorage.setItem("vekrom:channels_map", JSON.stringify(updatedChannels));
    set({ channelsMap: updatedChannels });
  },

  deleteChannel: (serverId, channelId) => {
    const updatedChannels = { ...get().channelsMap, [serverId]: (get().channelsMap[serverId] || []).filter((channel) => channel.id !== channelId) };
    const updatedMessages = { ...get().messagesMap };
    delete updatedMessages[channelId];
    try {
      localStorage.setItem("vekrom:channels_map", JSON.stringify(updatedChannels));
      localStorage.setItem("vekrom:messages_map", JSON.stringify(updatedMessages));
    } catch {}
    set({ channelsMap: updatedChannels, messagesMap: updatedMessages });
  },

  deleteServer: (serverId) => {
    const updatedServers = get().servers.filter((s) => s.id !== serverId);
    const updatedChannels = { ...get().channelsMap };
    delete updatedChannels[serverId];

    try {
      localStorage.setItem("vekrom:servers_list", JSON.stringify(updatedServers));
      localStorage.setItem("vekrom:channels_map", JSON.stringify(updatedChannels));
    } catch {}

    set({ servers: updatedServers, channelsMap: updatedChannels });
  },

  leaveServerLocal: (serverId) => {
    const updatedServers = get().servers.filter((server) => server.id !== serverId);
    try { localStorage.setItem("vekrom:servers_list", JSON.stringify(updatedServers)); } catch { /* mantém a saída visual mesmo se o armazenamento estiver indisponível */ }
    set({ servers: updatedServers });
  },

  updateServer: (serverId, data) => {
    const updatedServers = get().servers.map((server) => server.id === serverId ? { ...server, ...data } : server);
    try { localStorage.setItem("vekrom:servers_list", JSON.stringify(updatedServers)); } catch {}
    set({ servers: updatedServers });
  },

  addMessage: (channelId, content, username, attachments = []) => {
    const newMsg: MessageModel = {
      id: "msg_" + Date.now(),
      channelId,
      authorId: "usr_me",
      content,
      createdAt: new Date().toISOString(),
      editedAt: null,
      author: { id: "usr_me", username: username || "Você" },
      attachments,
    };

    const currentMsgs = get().messagesMap[channelId] || [];
    const updatedMessages = {
      ...get().messagesMap,
      [channelId]: [...currentMsgs, newMsg],
    };

    try {
      localStorage.setItem("vekrom:messages_map", JSON.stringify(updatedMessages));
    } catch {}

    set({ messagesMap: updatedMessages });
    return newMsg;
  },
}));
