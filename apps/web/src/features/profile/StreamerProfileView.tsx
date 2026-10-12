import React, { useState } from "react";
import { ChevronLeft, MoreHorizontal, Check, UserPlus, Play, Eye, Share2, Bell, Heart } from "lucide-react";
import { CURRENT_STREAMER, StreamerProfile } from "../../lib/mockData";
import { LiveBadge } from "../../components/ui/Badges";

interface StreamerProfileViewProps {
  streamer?: StreamerProfile;
  onBack?: () => void;
  onOpenStream?: (streamId: string) => void;
}

export function StreamerProfileView({
  streamer = CURRENT_STREAMER,
  onBack,
  onOpenStream,
}: StreamerProfileViewProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriendAdded, setIsFriendAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "about" | "video" | "likes">("home");

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] overflow-y-auto scroll-thin pb-24 md:pb-6">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0d0e12]/80 backdrop-blur-md border-b border-white/[0.05]">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-bold text-white tracking-wide">Profile</h1>
        <button
          className="p-2 -mr-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Opções"
        >
          <MoreHorizontal size={22} />
        </button>
      </header>

      {/* Banner & Hero Section */}
      <div className="relative">
        {/* Banner with dark cinematic overlay */}
        <div className="relative h-44 sm:h-56 w-full overflow-hidden">
          <img
            src={streamer.banner}
            alt="Streamer Banner"
            className="w-full h-full object-cover filter brightness-75 scale-105 transition-transform duration-700 hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0e12]/30 via-transparent to-[#0d0e12]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-[#0d0e12]/60 to-transparent" />
        </div>

        {/* Avatar with Live Indicator */}
        <div className="relative -mt-16 sm:-mt-20 flex flex-col items-center px-4">
          <div className="relative group">
            {/* Glowing Live Ring */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 shadow-[0_0_25px_rgba(244,63,94,0.55)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#12141a] p-0.5 border-2 border-[#0d0e12]">
                <img
                  src={streamer.avatar}
                  alt={streamer.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            {/* Live Badge Below Avatar */}
            {streamer.isLive && (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
                <LiveBadge size="md" />
              </div>
            )}
          </div>

          {/* User Details */}
          <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            {streamer.handle}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400 text-center max-w-sm whitespace-pre-line leading-relaxed font-normal">
            {streamer.bio}
          </p>

          {/* Metrics Counter Bar */}
          <div className="mt-5 w-full max-w-md bg-[#161820]/70 backdrop-blur-sm border border-white/[0.06] rounded-2xl py-3 px-6 flex items-center justify-around text-center shadow-lg shadow-black/20">
            <div className="flex flex-col items-center">
              <span className="text-base sm:text-lg font-extrabold text-white">{streamer.following}</span>
              <span className="text-[11px] font-medium text-zinc-400">Following</span>
            </div>
            <div className="h-7 w-[1px] bg-white/[0.08]" />
            <div className="flex flex-col items-center">
              <span className="text-base sm:text-lg font-extrabold text-white">{streamer.followers}</span>
              <span className="text-[11px] font-medium text-zinc-400">Followers</span>
            </div>
            <div className="h-7 w-[1px] bg-white/[0.08]" />
            <div className="flex flex-col items-center">
              <span className="text-base sm:text-lg font-extrabold text-white">{streamer.videos}</span>
              <span className="text-[11px] font-medium text-zinc-400">Videos</span>
            </div>
          </div>

          {/* Action Buttons: Follow & Add Friend */}
          <div className="mt-4 w-full max-w-md flex items-center gap-3">
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`flex-1 py-3 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-md ${
                isFollowing
                  ? "bg-[#1f232e] text-zinc-200 border border-white/10"
                  : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-blue-600/30"
              }`}
            >
              {isFollowing ? (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  <span>Seguindo</span>
                </>
              ) : (
                <>
                  <span>Follow</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsFriendAdded(!isFriendAdded)}
              className={`flex-1 py-3 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 bg-[#171922] hover:bg-[#202430] border border-white/[0.08] text-white ${
                isFriendAdded ? "border-emerald-500/40 text-emerald-400" : ""
              }`}
            >
              <UserPlus size={18} />
              <span>{isFriendAdded ? "Pedido Enviado" : "Add Friend"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="mt-6 border-b border-white/[0.08] px-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-around gap-2 text-sm font-semibold">
          {(["home", "about", "video", "likes"] as const).map((tab) => {
            const labels = {
              home: "Home",
              about: "About",
              video: "Video",
              likes: "Likes",
            };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 relative capitalize transition-colors duration-150 ${
                  active ? "text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {labels[tab]}
                {active && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#2563eb] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-5 max-w-2xl mx-auto w-full">
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* Recent Streams Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white tracking-wide">Recent Streams</h3>
                <button className="text-xs font-semibold text-zinc-400 hover:text-[#2563eb] transition-colors">
                  See all
                </button>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {streamer.recentStreams.map((stream) => (
                  <div
                    key={stream.id}
                    onClick={() => onOpenStream?.(stream.id)}
                    className="group bg-[#161821] border border-white/[0.06] hover:border-white/[0.15] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
                      <img
                        src={stream.thumbnail}
                        alt={stream.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/10">
                          <Eye size={11} />
                          {stream.viewers} watching
                        </span>
                        {stream.isLive && <LiveBadge size="sm" />}
                      </div>

                      {/* Duration / Game Tag */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-medium text-white/90">
                        <span className="px-2 py-0.5 rounded-md bg-blue-600/70 backdrop-blur-sm">
                          {stream.game}
                        </span>
                        {stream.duration && (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                            {stream.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stream Details */}
                    <div className="p-3">
                      <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {stream.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                        <span>{streamer.name}</span>
                        <span>•</span>
                        <span>{stream.game}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* About Blurb */}
            <div className="bg-[#14161f] border border-white/[0.06] rounded-2xl p-4">
              <h4 className="text-sm font-bold text-white mb-2">Sobre o Canal</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Streamer profissional e criador de conteúdo de FPS e Esports. Transmissões diárias com a comunidade, dicas de mira, estratégias competitivas e gameplay em alto nível.
              </p>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="bg-[#14161f] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Biografia e Equipamentos</h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {streamer.bio}
            </p>
            <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block">Jogo Principal</span>
                <span className="text-white font-semibold">{streamer.game}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Membros da Equipe</span>
                <span className="text-white font-semibold">Vekrom Creators</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "video" && (
          <div className="grid grid-cols-2 gap-3">
            {streamer.recentStreams.map((s) => (
              <div key={s.id} className="rounded-xl overflow-hidden bg-[#161821] border border-white/5 p-2">
                <img src={s.thumbnail} className="rounded-lg aspect-video object-cover w-full" />
                <p className="text-xs font-semibold text-white mt-2 line-clamp-1">{s.title}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "likes" && (
          <div className="text-center py-12 text-zinc-500 text-sm">
            <Heart size={32} className="mx-auto mb-2 text-zinc-600" />
            Nenhuma publicação curtida recentemente.
          </div>
        )}
      </div>
    </div>
  );
}
