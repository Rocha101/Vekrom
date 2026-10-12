import React, { useState } from "react";
import {
  Hash,
  Volume2,
  Plus,
  Users,
  Radio,
  Mic,
  MicOff,
  Headphones,
  Settings,
  ChevronDown,
  Server as ServerIcon,
  PhoneOff,
  Search,
  Sparkles,
  Video,
  VideoOff,
  ScreenShare,
  MoreHorizontal,
  LockKeyhole,
} from "lucide-react";
import { Channel, Server } from "../../lib/api";
import { gateway } from "../../lib/ws";
import { useUI, useAuth, usePresence, PRESENCE_META } from "../../stores";
import { useVoiceCallCtx } from "../voice/VoiceProvider";
import { UserSettingsModal } from "../settings/UserSettingsModal";
import { ServerSettingsModal } from "../servers/ServerSettingsModal";
import { ChannelSettingsModal } from "../channels/ChannelSettingsModal";
import type { ServerRole } from "../../stores";
import type { SocialUser } from "../../lib/types";

interface ChannelSidebarProps {
  currentServer: Server | null;
  channels: Channel[];
  currentChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: () => void;
  onLeaveServer: () => void;
  onUpdateServer: (data: { name: string; iconUrl: string | null; description: string }) => void;
  isServerOwner: boolean;
  canManageChannels: boolean;
  canEditServer: boolean;
  roles: ServerRole[];
  members: Array<{ id: string; username: string }>;
  onCreateRole: (name: string) => ServerRole;
  onSaveRole: (roleId: string, data: Partial<Pick<ServerRole, "name" | "color" | "permissions">>) => void;
  onDeleteRole: (roleId: string) => void;
  onToggleRoleMember: (roleId: string, memberId: string) => void;
  onUpdateChannel: (channelId: string, data: { name: string; isPrivate: boolean; userLimit?: number }) => void;
  onDeleteChannel: (channelId: string) => void;
  // DMs / Social Mode props
  activeDmUserId: string | null;
  friends: SocialUser[];
  onSelectDmUser: (user: SocialUser) => void;
  onOpenSocial: () => void;
  // User & Voice props
  username: string;
  voice: {
    channelId: string | null;
    muted: boolean;
    deafened: boolean;
    video?: boolean;
    sharing?: boolean;
    toggleMute: () => void;
    toggleDeafen: () => void;
    leave: () => void;
  };
}

function DMStatusIndicator({ status }: { status?: "streaming" | "online" | "idle" | "offline" | "dnd" }) {
  if (!status) return null;
  if (status === "online") {
    return <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#10121a] block shadow-sm" title="Disponível" />;
  }
  if (status === "idle") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#10121a] relative overflow-hidden block shadow-sm" title="Ausente">
        <span className="absolute -top-0.5 -left-0.5 w-full h-full bg-[#10121a] rounded-full scale-75" />
      </span>
    );
  }
  if (status === "dnd") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#10121a] grid place-items-center shadow-sm" title="Não perturbe">
        <span className="w-1.5 h-[1.5px] bg-white rounded-full" />
      </span>
    );
  }
  if (status === "streaming") {
    return <span className="w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-[#10121a] block shadow-sm" title="Transmitindo" />;
  }
  // offline
  return (
    <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-400 bg-[#10121a] grid place-items-center shadow-sm" title="Invisível">
      <span className="w-1 h-1 rounded-full bg-zinc-400" />
    </span>
  );
}

function DMRow({
  user,
  isActive,
  onSelect,
}: {
  user: SocialUser;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all text-left ${
        isActive
          ? "bg-[#35373c]/85 text-white shadow-sm border border-white/[0.05]"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-[#35373c]/35 active:scale-[0.99]"
      }`}
    >
      {/* Avatar aumentado para w-10 h-10 com indicador de status autêntico */}
      <div className="relative flex-shrink-0">
        {user.avatar ? <img
          src={user.avatar}
          alt={user.name}
          className="w-10 h-10 rounded-full object-cover transition-transform group-hover:scale-105"
        /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-[#242631] text-sm font-semibold text-zinc-200">{user.name.slice(0, 2).toUpperCase()}</span>}
        {user.status && <div className="absolute -bottom-0.5 -right-0.5">
          <DMStatusIndicator status={user.status} />
        </div>}
      </div>

      {/* Textos com nova tipografia e bio abaixo do nome */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-1.5 leading-tight">
          <span
            className={`text-[13.5px] truncate font-medium ${
              isActive ? "text-white font-semibold" : "text-zinc-200 group-hover:text-white"
            }`}
          >
            {user.name}
          </span>
        </div>

        {/* Bio em letras pequenas abaixo do nome (conforme solicitado e visto na Imagem 2!) */}
        <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate mt-0.5 leading-snug">
          {user.bio || user.activity || user.handle}
        </p>
      </div>
    </button>
  );
}

export function ChannelSidebar({
  currentServer,
  channels,
  currentChannelId,
  onSelectChannel,
  onCreateChannel,
  onLeaveServer,
  onUpdateServer,
  isServerOwner,
  canManageChannels,
  canEditServer,
  roles,
  members,
  onCreateRole,
  onSaveRole,
  onDeleteRole,
  onToggleRoleMember,
  onUpdateChannel,
  onDeleteChannel,
  activeDmUserId,
  friends,
  onSelectDmUser,
  onOpenSocial,
  username,
  voice,
}: ChannelSidebarProps) {
  const call = useVoiceCallCtx();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [channelSettings, setChannelSettings] = useState<Channel | null>(null);
  const avatarUrl = useAuth((s) => s.avatarUrl);
  const presenceStatus = usePresence((s) => s.status);

  const disconnectCall = () => {
    call.stop();
    voice.leave();
    try {
      gateway.send("VOICE_STATE_UPDATE", { channelId: null });
    } catch { /* noop */ }
  };

  const toggleCallMute = () => {
    const m = !voice.muted;
    call.setMicrophone(m);
    voice.toggleMute();
    if (voice.channelId) {
      try {
        gateway.send("VOICE_STATE_UPDATE", { channelId: voice.channelId, mute: m });
      } catch { /* noop */ }
    }
  };

  const toggleCallDeafen = () => {
    const d = !voice.deafened;
    voice.toggleDeafen();
    if (voice.channelId) {
      try {
        gateway.send("VOICE_STATE_UPDATE", { channelId: voice.channelId, deaf: d });
      } catch { /* noop */ }
    }
  };

  const handleScreenButton = () => {
    if (voice.sharing) {
      void call.toggleScreen();
    } else {
      // Mesmo modal da interface da chamada (prévia + transmitir)
      useUI.getState().setShareModalOpen(true);
    }
  };
  const textChannels = channels.filter((c) => c.type !== "voice");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  return (
    <aside className="w-64 min-w-[256px] max-w-[256px] h-full bg-[#10121a] border-r border-white/[0.06] flex flex-col min-h-0 select-none flex-shrink-0">
      {/* Header aligned at 56px */}
      {currentServer ? (
        <div className="h-14 min-h-[56px] px-4 flex items-center justify-between border-b border-white/[0.06] shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {currentServer.iconUrl && (
              <img
                src={currentServer.iconUrl}
                alt={currentServer.name}
                className="w-7 h-7 rounded-lg object-cover border border-white/10 flex-shrink-0"
              />
            )}
            <span className="font-extrabold text-sm text-white truncate">
              {currentServer.name}
            </span>
          </div>
          <button
            onClick={() => setServerSettingsOpen(true)}
            title="Abrir configurações do servidor"
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Configurações do servidor"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      ) : (
        <div className="h-14 min-h-[56px] px-4 flex items-center justify-between border-b border-white/[0.06] flex-shrink-0">
          <span className="font-extrabold text-sm text-white tracking-wide flex items-center gap-2">
            <Sparkles size={16} className="text-[#2563eb]" />
            Vekrom Hub
          </span>
        </div>
      )}

      {/* Main navigation list */}
      <div className="flex-1 overflow-y-auto scroll-none p-2 space-y-4">
        {currentServer ? (
          <>
            {/* Text Channels */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Canais de Texto</span>
                {canManageChannels && <button
                  onClick={onCreateChannel}
                  className="hover:text-white transition-colors"
                  title="Criar Canal"
                >
                  <Plus size={14} />
                </button>}
              </div>

              <div className="space-y-0.5">
                {textChannels.map((c) => {
                  const isActive = currentChannelId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`group w-full flex items-center gap-1 rounded-xl px-2 transition-all ${
                        isActive
                          ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <button onClick={() => onSelectChannel(c.id)} title={c.isPrivate ? "Canal privado" : "Canal público"} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-xs font-medium">
                        {c.isPrivate ? <LockKeyhole size={15} aria-label="Canal privado" className={isActive ? "text-white" : "text-amber-300"} /> : <Hash size={16} className={isActive ? "text-white" : "text-zinc-500"} />}
                        <span className="truncate">{c.name}</span>
                      </button>
                      <button onClick={() => setChannelSettings(c)} title={`Configurações de #${c.name}`} aria-label={`Configurações de ${c.name}`} className="rounded p-1 text-zinc-400 opacity-75 transition-colors hover:bg-black/10 hover:text-white hover:opacity-100"><Settings size={14}/></button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voice Channels */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Canais de Voz</span>
              </div>

              <div className="space-y-0.5">
                {voiceChannels.map((c) => {
                  const isActive = currentChannelId === c.id;
                  const isConnected = voice.channelId === c.id;

                  return (
                    <div
                      key={c.id}
                      className={`group w-full flex items-center justify-between rounded-xl px-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#1c202d] text-white border border-white/10"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <button onClick={() => { void call.prepareSpeechContext(); onSelectChannel(c.id); }} title={`${c.name}${c.isPrivate ? " • privado" : " • público"}${c.userLimit ? ` • limite ${c.userLimit}` : " • sem limite"}`} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
                        <Volume2
                          size={16}
                          className={isConnected ? "text-emerald-400 animate-pulse" : "text-zinc-500"}
                        />
                        <span className="truncate">{c.name}</span>
                      </button>
                      {isConnected && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                          Conectado
                        </span>
                      )}
                      <span className="mr-1 shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">{c.userLimit ? `${c.userLimit} máx.` : "Sem limite"}</span>
                      {c.isPrivate && <span title="Canal privado"><LockKeyhole size={13} aria-label="Canal privado" className="mr-1 text-amber-300"/></span>}
                      <button onClick={() => setChannelSettings(c)} title={`Configurações de ${c.name}`} aria-label={`Configurações de ${c.name}`} className="rounded p-1 text-zinc-400 opacity-75 transition-colors hover:bg-black/10 hover:text-white hover:opacity-100"><Settings size={14}/></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Home / DMs Mode */
          <div className="space-y-3">
            {/* Quick Actions */}
            <div className="space-y-0.5">
              <button
                onClick={onOpenSocial}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <Users size={18} className="text-[#2563eb]" />
                <span>Amigos & Social</span>
              </button>
            </div>

            {/* Direct Messages Section */}
            <div className="pt-2 border-t border-white/[0.05]">
              <div className="flex items-center justify-between px-2 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Mensagens Diretas</span>
                <button
                  type="button"
                  onClick={onOpenSocial}
                  title="Criar MD"
                  className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-1">
                {friends.map((u) => (
                  <DMRow
                    key={u.id}
                    user={u}
                    isActive={activeDmUserId === u.id}
                    onSelect={() => onSelectDmUser(u)}
                  />
                ))}
                {friends.length === 0 && <p className="px-2 py-2 text-xs text-zinc-500">Seus amigos aparecerão aqui.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Connection Dock if Connected (Matches media_1790547248482.png) */}
      {voice.channelId && (
        <div className="p-3 bg-[#0a0b10] border-t border-white/[0.06] space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <Radio size={14} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[12px] font-bold text-emerald-400 block leading-tight">
                  Voz conectada
                </span>
                <span className="text-[10px] text-zinc-400 truncate block">
                  {currentServer?.name || "Canal de voz"} / RTC
                </span>
              </div>
            </div>
            <button
              onClick={disconnectCall}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
              title="Desconectar da voz"
            >
              <PhoneOff size={16} />
            </button>
          </div>

          {/* Quick Action Buttons: Video Camera & Screen Share (Exact style of media_1790547248482.png) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Camera Button */}
            <button
              onClick={() => void call.toggleCamera()}
              className={`relative h-9 rounded-lg flex items-center justify-center transition-all ${
                voice.video
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                  : "bg-[#2b2d31] hover:bg-[#35373c] text-zinc-200"
              }`}
              title={voice.video ? "Desligar Câmera" : "Ligar Câmera"}
            >
              {voice.video ? <Video size={18} /> : <Video size={18} className="opacity-90" />}
              {!voice.video && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#f23f43] grid place-items-center border-2 border-[#0a0b10]">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <line x1="1" y1="9" x2="9" y2="1" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </button>

            {/* Screen Share Button */}
            <button
              onClick={handleScreenButton}
              className={`relative h-9 rounded-lg flex items-center justify-center transition-all ${
                voice.sharing
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                  : "bg-[#2b2d31] hover:bg-[#35373c] text-zinc-200"
              }`}
              title={voice.sharing ? "Parar Compartilhamento" : "Compartilhar Tela"}
            >
              <ScreenShare size={18} className={voice.sharing ? "text-white" : "opacity-90"} />
              {!voice.sharing && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#f23f43] grid place-items-center border-2 border-[#0a0b10]">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <line x1="1" y1="9" x2="9" y2="1" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </button>
          </div>

          {/* Mute and Deafen Controls */}
          <div className="flex items-center justify-around pt-1 border-t border-white/[0.04]">
            <button
              onClick={toggleCallMute}
              className={`flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                voice.muted ? "bg-rose-500/15 text-rose-400 font-semibold" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
              title={voice.muted ? "Desativar Mudo" : "Ativar Mudo"}
            >
              {voice.muted ? <MicOff size={15} /> : <Mic size={15} />}
              <span className="text-[11px]">{voice.muted ? "Mutado" : "Mic"}</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button
              onClick={toggleCallDeafen}
              className={`flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                voice.deafened ? "bg-rose-500/15 text-rose-400 font-semibold" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
              title={voice.deafened ? "Reativar Áudio" : "Desativar Áudio"}
            >
              <Headphones size={15} />
              <span className="text-[11px]">{voice.deafened ? "Surdo" : "Áudio"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Current Logged-in User Profile Bar */}
      <div className="h-14 min-h-[56px] px-3 bg-[#08090e] border-t border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2.5 min-w-0 text-left p-1 -ml-1 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer group"
          title="Ver perfil e configurações"
        >
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center text-xs overflow-hidden group-hover:ring-2 group-hover:ring-[#5865f2] transition-all">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                username ? username.slice(0, 2).toUpperCase() : "U"
              )}
            </div>
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#08090e] ${PRESENCE_META[presenceStatus].dot}`} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-white block truncate leading-tight group-hover:text-zinc-100">
              {username || "Usuário"}
            </span>
            <span className="text-[10px] text-zinc-400 block truncate">{PRESENCE_META[presenceStatus].label}</span>
          </div>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors flex-shrink-0"
          title="Configurações de Usuário"
        >
          <Settings size={16} />
        </button>
      </div>

      <UserSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {currentServer && <ServerSettingsModal
        key={currentServer.id}
        isOpen={serverSettingsOpen}
        server={currentServer}
        isOwner={isServerOwner}
        canEditServer={canEditServer}
        roles={roles}
        members={members}
        onCreateRole={onCreateRole}
        onSaveRole={onSaveRole}
        onDeleteRole={onDeleteRole}
        onToggleRoleMember={onToggleRoleMember}
        onClose={() => setServerSettingsOpen(false)}
        onSave={onUpdateServer}
        onLeave={() => { setServerSettingsOpen(false); onLeaveServer(); }}
      />}
      {channelSettings && <ChannelSettingsModal
        key={channelSettings.id}
        channel={channelSettings}
        isOwner={isServerOwner}
        onClose={() => setChannelSettings(null)}
        onSave={(data) => onUpdateChannel(channelSettings.id, data)}
        onDelete={() => { const id = channelSettings.id; setChannelSettings(null); onDeleteChannel(id); }}
      />}
    </aside>
  );
}
