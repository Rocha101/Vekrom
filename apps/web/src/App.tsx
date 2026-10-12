import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api, type Server, type Channel, type ChatMessage, type ChatAttachment } from "./lib/api";
import { gateway } from "./lib/ws";
import { useAuth, useUI, useVoice, useServerStore, MobileTab, defaultServerRole } from "./stores";
import { BottomNav } from "./features/navigation/BottomNav";
import { StreamerProfileView } from "./features/profile/StreamerProfileView";
import { SocialView } from "./features/social/SocialView";
import { DirectChatView } from "./features/chat/DirectChatView";
import { StreamsExploreView } from "./features/streams/StreamsExploreView";
import { ServerRail } from "./features/navigation/ServerRail";
import { ChannelSidebar } from "./features/navigation/ChannelSidebar";
import { ChannelChatView } from "./features/chat/ChannelChatView";
import { VoiceChannelView } from "./features/voice/VoiceChannelView";
import { VoiceProvider } from "./features/voice/VoiceProvider";
import { GlobalShareModal } from "./features/voice/ScreenShareModal";
import { MemberList, type ServerMember } from "./features/members/MemberList";
import { MemberProfileModal } from "./features/members/MemberProfileModal";
import { CreateServerModal } from "./features/servers/CreateServerModal";
import { CreateChannelModal } from "./features/channels/CreateChannelModal";
import type { SocialUser, StreamerProfile } from "./lib/types";
import { Sparkles, ArrowRight, LockKeyhole } from "lucide-react";

/* ---------- Modern Auth Pages ---------- */
function LoginPage() {
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await api.login(email, password);
      login(r.token, r.user.id, r.user.username);
      nav("/channels/@me");
    } catch {
      setErr("Não foi possível entrar. Confira seus dados e verifique se o servidor está disponível.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-[#12141c]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 flex flex-col gap-5 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2563eb] to-[#3b82f6] flex items-center justify-center shadow-lg shadow-blue-600/40 mb-3">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Boas-vindas ao Vekrom</h1>
          <p className="text-xs text-zinc-400 mt-1">Converse, jogue e assista transmissões ao vivo</p>
        </div>

        {err && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {err}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d0e12] border border-white/10 focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d0e12] border border-white/10 focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#2563eb] hover:bg-blue-600 active:scale-98 text-white transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
        >
          <span>{loading ? "Entrando..." : "Entrar na Conta"}</span>
          <ArrowRight size={16} />
        </button>

        <div className="flex items-center justify-center text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
          <a href="/register" className="text-[#2563eb] hover:underline font-semibold">
            Criar nova conta
          </a>
        </div>
      </form>
    </div>
  );
}

function RegisterPage() {
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const r = await api.register(username, email, password);
      login(r.token, r.user.id, r.user.username);
      nav("/channels/@me");
    } catch {
      setErr("Não foi possível criar a conta. Confira os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <form
        onSubmit={handleRegister}
        className="w-full max-w-md bg-[#12141c]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 flex flex-col gap-4 shadow-2xl relative z-10"
      >
        <div className="text-center mb-2">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Criar Conta</h1>
          <p className="text-xs text-zinc-400 mt-1">Junte-se à comunidade de games e streams</p>
        </div>

        {err && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-300">{err}</div>}

        <input
          placeholder="Nome de usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-[#0d0e12] border border-white/10 focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white outline-none"
          required
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#0d0e12] border border-white/10 focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white outline-none"
          required
        />
        <input
          type="password"
          placeholder="Senha (mínimo 8 dígitos)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#0d0e12] border border-white/10 focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white outline-none"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#2563eb] hover:bg-blue-600 text-white transition-all shadow-lg shadow-blue-600/30"
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>

        <a href="/login" className="text-xs text-center text-[#2563eb] hover:underline mt-2">
          Já possui conta? Entrar
        </a>
      </form>
    </div>
  );
}

/* ---------- Main App Shell ---------- */
function Shell() {
  const token = useAuth((s) => s.token);
  const username = useAuth((s) => s.username) || "Usuário";
  const userId = useAuth((s) => s.userId) || "me";
  const avatarUrl = useAuth((s) => s.avatarUrl);
  const bio = useAuth((s) => s.bio);
  const logout = useAuth((s) => s.logout);
  const nav = useNavigate();
  const qc = useQueryClient();

  const {
    serverId,
    channelId,
    setServer,
    setChannel,
    showMembers,
    toggleMembers,
    showChannels,
    toggleChannels,
    mobileTab,
    setMobileTab,
    selectedDmUser,
    setSelectedDmUser,
    activeStreamer,
    setActiveStreamer,
  } = useUI();

  const voice = useVoice();
  const [profileMember, setProfileMember] = useState<ServerMember | null>(null);
  const { data: apiFriends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends, enabled: Boolean(token) });
  const friends: SocialUser[] = apiFriends.filter((friend) => friend.status === "accepted").map((friend) => ({
    id: String(friend.id), name: friend.username, handle: `@${friend.username}#${friend.discriminator}`, avatar: friend.avatarUrl ?? null,
  }));
  const currentProfile: StreamerProfile = { id: userId, name: username, handle: `@${username}`, avatar: avatarUrl, bio, recentStreams: [] };
  const handleAddFriend = async (friendUsername: string) => {
    await api.addFriend(friendUsername);
    await qc.invalidateQueries({ queryKey: ["friends"] });
  };

  // Gateway realtime: conecta somente com JWT válido.
  useEffect(() => {
    if (token && token.split(".").length === 3) {
      gateway.connect(token);
      return () => gateway.disconnect();
    }
  }, [token]);
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  // Persistent Server & Channel store
  const {
    servers,
    channelsMap,
    messagesMap,
    addServer,
    addChannel,
    deleteServer,
    leaveServerLocal,
    updateServer,
    updateChannel,
    deleteChannel: removeChannel,
    addMessage,
    rolesMap,
    createRole,
    updateRole,
    deleteRole,
    toggleRoleMember,
  } = useServerStore();

  const channels = serverId ? (channelsMap[serverId] || []) : [];
  const currentServer = servers.find((s) => s.id === serverId) ?? null;
  const currentChannel = channels.find((c) => c.id === channelId) ?? null;
  const isCurrentServerOwner = !!currentServer && (currentServer.ownerId === (useAuth.getState().userId || "me") || currentServer.ownerId === "me");
  const serverRoles = serverId ? (rolesMap[serverId] ?? [defaultServerRole()]).map((role) => ({
    ...role,
    permissions: { ...defaultServerRole().permissions, ...role.permissions },
  })) : [];
  const myRolePermissions = serverRoles.filter((role) => role.isDefault || role.memberIds.includes(userId)).map((role) => role.permissions);
  const canManageChannels = isCurrentServerOwner || myRolePermissions.some((permissions) => permissions.manageChannels);
  const canEditServer = isCurrentServerOwner || myRolePermissions.some((permissions) => permissions.manageServer);
  const canKickMembers = isCurrentServerOwner || myRolePermissions.some((permissions) => permissions.kickMembers);
  const canBanMembers = isCurrentServerOwner || myRolePermissions.some((permissions) => permissions.banMembers);
  const canMuteMembers = isCurrentServerOwner || myRolePermissions.some((permissions) => permissions.muteMembers);
  const canDeafenMembers = isCurrentServerOwner || myRolePermissions.some((permissions) => permissions.deafenMembers);
  const canAccessCurrentChannel = isCurrentServerOwner || (currentChannel?.isPrivate ? myRolePermissions.some((permissions) => permissions.viewPrivateChannels) : myRolePermissions.some((permissions) => permissions.viewChannels));
  const canConnectToVoice = isCurrentServerOwner || myRolePermissions.some((permissions) => permissions.connect);
  const channelMessages = channelId ? (messagesMap[channelId] || []) : [];

  const { data: serverMembers = [] } = useQuery({
    queryKey: ["serverMembers", serverId],
    queryFn: () => api.members(serverId!),
    enabled: Boolean(token && serverId && /^\d+$/.test(serverId)),
  });
  const members: ServerMember[] = serverMembers.map((member) => ({
    id: String(member.id), username: member.nickname || member.username, avatar: member.avatarUrl || "",
    handle: `@${member.username}`, status: "unknown" as const,
    voiceMuted: member.voiceMuted, soundMuted: member.soundMuted,
    roleNames: [
      ...(String(member.id) === userId && isCurrentServerOwner ? [{ name: "Dono", color: "#f1c40f" }] : []),
      ...serverRoles.filter((role) => role.memberIds.includes(String(member.id))).map((role) => ({ name: role.name, color: role.color })),
    ],
  }));

  const handleModerateMember = async (member: ServerMember, action: "kick" | "ban" | "voice_mute" | "sound_mute", enabled = true) => {
    const permitted = action === "kick" ? canKickMembers : action === "ban" ? canBanMembers : action === "voice_mute" ? canMuteMembers : canDeafenMembers;
    if (!currentServer || !permitted) throw new Error("Seu cargo não tem permissão para esta ação.");
    if (!/^\d+$/.test(currentServer.id) || !/^\d+$/.test(member.id)) throw new Error("A moderação precisa de um servidor e membros salvos no servidor.");
    await api.moderateMember(currentServer.id, member.id, action, enabled);
    await qc.invalidateQueries({ queryKey: ["serverMembers", currentServer.id] });
    if (action === "kick" || action === "ban") {
      setProfileMember(null);
      return;
    }
  };

  // Auto select first channel when switching or creating server
  useEffect(() => {
    if (serverId && channels.length > 0) {
      const channelExists = channels.some((c) => c.id === channelId);
      if (!channelId || !channelExists) {
        setChannel(channels[0].id);
      }
    }
  }, [serverId, channels, channelId, setChannel]);

  if (!token) return <Navigate to="/login" replace />;

  // Send channel message
  const handleSendChannelMessage = async (content: string, attachments: ChatAttachment[] = []) => {
    if (!channelId) return;
    addMessage(channelId, content, username, attachments);
    try {
      await api.sendMessage(channelId, content, attachments);
    } catch {}
  };

  // Modern Server Creation: Immediately goes to the new server with ONLY "Chat geral" text channel
  const handleCreateServer = async (name: string, template?: string, iconUrl?: string) => {
    const { server: newServer, defaultChannel } = addServer(name, iconUrl);

    // Call API in background if backend is connected
    api.createServer(name).catch(() => {});
    api.createChannel(newServer.id, "Chat geral").catch(() => {});

    // Immediately navigate to the created server (Screen from Image 1!) with # Chat geral open
    setServer(newServer.id);
    setChannel(defaultChannel.id);
    setSelectedDmUser(null);
  };

  // Modern Channel Creation
  const handleCreateChannel = async (name: string, type: "text" | "voice") => {
    if (!serverId) return;
    const newChannel = addChannel(serverId, name, type);
    api.createChannel(serverId, name).catch(() => {});
    setChannel(newChannel.id);
  };

  const handleLeaveServer = () => {
    if (!serverId) return;
    const leavingServerId = serverId;
    // Remove o servidor selecionado da interface e atualiza a lista da API.
    leaveServerLocal(leavingServerId);
    setSelectedDmUser(null);
    setProfileMember(null);
    setServer(null);
    setMobileTab("social");
    void api.leaveServer(leavingServerId).catch(() => undefined).finally(() => {
      qc.invalidateQueries({ queryKey: ["servers"] });
    });
  };

  return (
    <VoiceProvider>
    <div className="h-full w-full flex bg-[#07080a] text-[#e2e5eb] overflow-hidden select-none">
      {/* 1. Desktop Left Server Rail */}
      <div className="hidden md:flex flex-col h-full flex-shrink-0">
        <ServerRail
          servers={servers}
          activeServerId={serverId}
          onSelectServer={(id) => {
            setServer(id);
            setSelectedDmUser(null);
          }}
          onCreateServer={() => setIsCreateServerOpen(true)}
          onLogout={() => {
            logout();
            gateway.disconnect();
            nav("/login");
          }}
        />
      </div>

      {/* 2. Desktop Channel / DMs Sidebar */}
      <div className="hidden md:flex flex-col h-full flex-shrink-0">
        <ChannelSidebar
          currentServer={currentServer}
          isServerOwner={currentServer?.ownerId === (useAuth.getState().userId || "me") || currentServer?.ownerId === "me"}
          canManageChannels={canManageChannels}
          canEditServer={canEditServer}
          roles={serverRoles}
          members={members}
          onCreateRole={(name) => { if (!isCurrentServerOwner || !serverId) throw new Error("Somente o dono pode criar cargos."); return createRole(serverId, name); }}
          onSaveRole={(id, data) => { if (!isCurrentServerOwner || !serverId) throw new Error("Somente o dono pode editar cargos."); updateRole(serverId, id, data); }}
          onDeleteRole={(id) => { if (isCurrentServerOwner && serverId) deleteRole(serverId, id); }}
          onToggleRoleMember={(id, memberId) => { if (isCurrentServerOwner && serverId) toggleRoleMember(serverId, id, memberId); }}
          onUpdateServer={(data) => { if (!serverId || !canEditServer) throw new Error("Seu cargo não pode editar este servidor."); updateServer(serverId, data); }}
          onUpdateChannel={(channelId, data) => { if (!serverId || !isCurrentServerOwner) throw new Error("Somente o dono pode alterar este canal."); updateChannel(serverId, channelId, data); }}
          onDeleteChannel={(channelId) => {
            if (!serverId || !isCurrentServerOwner) return;
            removeChannel(serverId, channelId);
            if (channelId === useUI.getState().channelId) setChannel(null);
          }}
          channels={channels}
          currentChannelId={channelId}
          onSelectChannel={(chId) => setChannel(chId)}
          onCreateChannel={() => setIsCreateChannelOpen(true)}
          onLeaveServer={handleLeaveServer}
          activeDmUserId={selectedDmUser?.id ?? null}
          friends={friends}
          onSelectDmUser={(u) => setSelectedDmUser(u)}
          onOpenSocial={() => {
            setSelectedDmUser(null);
            setMobileTab("social");
          }}
          username={username}
          voice={voice}
        />
      </div>

      {/* 3. Main Center Stage (Responsive across Mobile, Tablet, Desktop) */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#0d0e12] relative h-full">
        {/* If a Direct Message is active */}
        {selectedDmUser ? (
          <DirectChatView
            user={selectedDmUser}
            onBack={() => setSelectedDmUser(null)}
            onOpenVoiceCall={(u) => {
              voice.join("call_" + u.id);
            }}
          />
        ) : serverId && currentChannel && !canAccessCurrentChannel ? (
          <div className="flex flex-1 flex-col items-center justify-center bg-[#0d0e12] p-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><LockKeyhole size={28} /></div>
            <h2 className="mt-5 text-xl font-bold text-white">Canal privado</h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">Este canal é privado e sua conta não tem permissão para acessá-lo. Peça ao dono do servidor para alterar a visibilidade do canal.</p>
            <span className="mt-4 rounded-full bg-[#202127] px-3 py-1 text-xs text-zinc-400">{currentChannel.name}</span>
          </div>
        ) : serverId && currentChannel ? (
          /* Server Channel View */
          currentChannel.type === "voice" ? (
            <VoiceChannelView
              channelId={currentChannel.id}
              channelName={currentChannel.name}
              userLimit={currentChannel.userLimit ?? 0}
              canConnect={canConnectToVoice}
              voice={voice}
              username={username}
            />
          ) : (
            <ChannelChatView
              channelId={currentChannel.id}
              channelName={currentChannel.name}
              messages={channelMessages}
              onToggleChannels={toggleChannels}
              onToggleMembers={toggleMembers}
              onSendMessage={handleSendChannelMessage}
            />
          )
        ) : (
          /* Home and mobile navigation views */
          <>
            {mobileTab === "profile" && (
              <StreamerProfileView
                streamer={activeStreamer || currentProfile}
                onBack={() => setMobileTab("social")}
              />
            )}

            {mobileTab === "social" && (
              <SocialView
                onBack={() => setMobileTab("home")}
                friends={friends}
                onSelectUserForChat={(user) => setSelectedDmUser(user)}
                onAddFriend={handleAddFriend}
              />
            )}

            {mobileTab === "streams" && <StreamsExploreView />}

            {mobileTab === "home" && <StreamsExploreView />}

            {mobileTab === "search" && (
              <SocialView
                onBack={() => setMobileTab("home")}
                friends={friends}
                onSelectUserForChat={(user) => setSelectedDmUser(user)}
                onAddFriend={handleAddFriend}
              />
            )}
          </>
        )}

        {/* Mobile Slide-Over Drawer for Channels if opened on phone */}
        {showChannels && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={toggleChannels}
            />
            <div className="relative w-72 max-w-[85vw] h-full flex z-10">
              <ServerRail
                servers={servers}
                activeServerId={serverId}
                onSelectServer={(id) => {
                  setServer(id);
                  setSelectedDmUser(null);
                  toggleChannels();
                }}
                onCreateServer={() => {
                  setIsCreateServerOpen(true);
                  toggleChannels();
                }}
                onLogout={logout}
              />
              <ChannelSidebar
                currentServer={currentServer}
                channels={channels}
                currentChannelId={channelId}
                onSelectChannel={(id) => {
                  setChannel(id);
                  toggleChannels();
                }}
                onCreateChannel={() => {
                  setIsCreateChannelOpen(true);
                  toggleChannels();
                }}
                onLeaveServer={() => {
                  handleLeaveServer();
                  toggleChannels();
                }}
                isServerOwner={currentServer?.ownerId === (useAuth.getState().userId || "me") || currentServer?.ownerId === "me"}
                canManageChannels={canManageChannels}
                canEditServer={canEditServer}
                roles={serverRoles}
                members={members}
                onCreateRole={(name) => { if (!isCurrentServerOwner || !serverId) throw new Error("Somente o dono pode criar cargos."); return createRole(serverId, name); }}
                onSaveRole={(id, data) => { if (!isCurrentServerOwner || !serverId) throw new Error("Somente o dono pode editar cargos."); updateRole(serverId, id, data); }}
                onDeleteRole={(id) => { if (isCurrentServerOwner && serverId) deleteRole(serverId, id); }}
                onToggleRoleMember={(id, memberId) => { if (isCurrentServerOwner && serverId) toggleRoleMember(serverId, id, memberId); }}
                onUpdateServer={(data) => { if (!serverId || !canEditServer) throw new Error("Seu cargo não pode editar este servidor."); updateServer(serverId, data); }}
                onUpdateChannel={(id, data) => { if (!serverId || !isCurrentServerOwner) throw new Error("Somente o dono pode alterar este canal."); updateChannel(serverId, id, data); }}
                onDeleteChannel={(id) => {
                  if (!serverId || !isCurrentServerOwner) return;
                  removeChannel(serverId, id);
                  if (id === channelId) setChannel(null);
                }}
                activeDmUserId={selectedDmUser?.id ?? null}
                friends={friends}
                onSelectDmUser={(u) => {
                  setSelectedDmUser(u);
                  toggleChannels();
                }}
                onOpenSocial={() => {
                  setSelectedDmUser(null);
                  setMobileTab("social");
                  toggleChannels();
                }}
                username={username}
                voice={voice}
              />
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (Hidden when actively inside a DM chat) */}
        {!selectedDmUser && (
          <BottomNav
            activeTab={mobileTab}
            onTabChange={(tab) => {
              setMobileTab(tab);
              if (serverId) setServer(null);
            }}
            userAvatar={avatarUrl ?? undefined}
          />
        )}
      </main>

      {/* 4. Desktop Right Members Sidebar (When in a server channel) */}
      {serverId && showMembers && (
        <div className="hidden lg:flex flex-col">
          <MemberList
            members={members}
            onSelectMember={setProfileMember}
          />
        </div>
      )}

      {profileMember && currentServer && <MemberProfileModal
        member={profileMember}
        serverName={currentServer.name}
        canModerateTarget={profileMember.id !== userId && profileMember.id !== currentServer.ownerId && (canKickMembers || canBanMembers || canMuteMembers || canDeafenMembers)}
        canKick={canKickMembers}
        canBan={canBanMembers}
        canMuteVoice={canMuteMembers}
        canMuteSound={canDeafenMembers}
        onModerate={handleModerateMember}
        onClose={() => setProfileMember(null)}
        onMessage={(member) => {
          setServer(null);
          setMobileTab("social");
          setSelectedDmUser({
            id: member.id,
            name: member.username,
            handle: member.handle,
            avatar: member.avatar,
            bio: member.bio,
          });
          setProfileMember(null);
        }}
      />}

      {/* Modern Server Creation Modal (Exact layout from Image 2) */}
      <CreateServerModal
        isOpen={isCreateServerOpen}
        onClose={() => setIsCreateServerOpen(false)}
        onCreateServer={handleCreateServer}
        username={username}
      />

      {/* Modern Channel Creation Modal */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        serverName={currentServer?.name || "Servidor"}
        onCreateChannel={handleCreateChannel}
      />

      {/* Modal global de transmissão de tela (sidebar + chamada usam o mesmo) */}
      <GlobalShareModal />
    </div>
    </VoiceProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/channels/*" element={<Shell />} />
      <Route path="*" element={<Navigate to="/channels/@me" replace />} />
    </Routes>
  );
}
