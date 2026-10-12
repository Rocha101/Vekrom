import React, { useState } from "react";
import { ChevronLeft, MoreHorizontal, Search, MessageSquare, UserPlus, Flame, Sparkles, Users } from "lucide-react";
import { SOCIAL_PEOPLE, JESUS_BROWN_CHAT, SocialUser } from "../../lib/mockData";
import { VerifiedBadge, StatusIndicator } from "../../components/ui/Badges";

interface SocialViewProps {
  onBack?: () => void;
  onSelectUserForChat: (user: SocialUser) => void;
  onSelectUserForProfile?: (user: SocialUser) => void;
}

export function SocialView({ onBack, onSelectUserForChat, onSelectUserForProfile }: SocialViewProps) {
  const [activeTab, setActiveTab] = useState<"friends" | "chats">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const filteredPeople = SOCIAL_PEOPLE.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    setSuccessToast(`Solicitação de amizade enviada para ${newFriendName}!`);
    setNewFriendName("");
    setShowAddModal(false);
    setTimeout(() => setSuccessToast(""), 4000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] overflow-y-auto scroll-thin pb-24 md:pb-6">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0d0e12]/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -ml-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Voltar"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <Users size={20} className="text-[#2563eb]" />
          <h1 className="text-base font-bold text-white tracking-wide">Amigos & Social</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 -mr-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Mais opções"
        >
          <MoreHorizontal size={22} />
        </button>
      </header>

      {/* Toast Alert */}
      {successToast && (
        <div className="mx-4 mt-2 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Sparkles size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Segmented Switcher: Amigos & Conversas */}
      <div className="border-b border-white/[0.08] px-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-3 text-center text-sm font-bold relative transition-colors ${
              activeTab === "friends" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Amigos
            {activeTab === "friends" && (
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-[#2563eb] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-3 text-center text-sm font-bold relative transition-colors ${
              activeTab === "chats" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Conversas
            {activeTab === "chats" && (
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-[#2563eb] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
            )}
          </button>
        </div>
      </div>

      {/* Search Bar & Quick Add */}
      <div className="px-4 pt-4 max-w-2xl mx-auto w-full flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar amigos por nome ou @tag..."
            className="w-full bg-[#161821] border border-white/[0.06] focus:border-[#2563eb]/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 bg-[#1b1e2a] hover:bg-[#2563eb] text-zinc-300 hover:text-white border border-white/10 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
          title="Adicionar Amigo"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Adicionar Amigo</span>
        </button>
      </div>

      {/* Content Container */}
      <div className="px-4 py-4 max-w-2xl mx-auto w-full space-y-6">
        {activeTab === "friends" ? (
          <div>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">
              Todos os Amigos ({filteredPeople.length})
            </h2>
            <div className="divide-y divide-white/[0.04]">
              {filteredPeople.map((user) => (
                <div
                  key={user.id}
                  className="group flex items-center justify-between py-3 px-2 rounded-xl hover:bg-[#161821]/80 transition-colors"
                >
                  <div
                    onClick={() => onSelectUserForChat(user)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-11 h-11 rounded-full object-cover border border-white/10"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <StatusIndicator status={user.status} />
                      </div>
                    </div>

                    {/* Name & Bio */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                          {user.name}
                        </span>
                        {user.verified && <VerifiedBadge size={14} />}
                      </div>
                      <span className="text-xs text-zinc-400 block truncate">
                        {user.bio || user.activity || user.handle}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Button: Message */}
                  <button
                    onClick={() => onSelectUserForChat(user)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Enviar Mensagem"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Chats Tab Content */
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">
              Conversas Recentes
            </h2>

            {/* Jesus Brown thread card */}
            <div
              onClick={() => onSelectUserForChat(JESUS_BROWN_CHAT.user)}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#161821] hover:bg-[#1d202b] border border-white/[0.06] cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <img
                    src={JESUS_BROWN_CHAT.user.avatar}
                    alt={JESUS_BROWN_CHAT.user.name}
                    className="w-12 h-12 rounded-full object-cover border border-white/10"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#161821]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">
                        {JESUS_BROWN_CHAT.user.name}
                      </span>
                      <Flame size={14} className="text-amber-500 fill-amber-500 animate-bounce" />
                    </div>
                    <span className="text-[11px] text-zinc-400">3 min atrás</span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {JESUS_BROWN_CHAT.messages[JESUS_BROWN_CHAT.messages.length - 1]?.text || "Conversa direta"}
                  </p>
                </div>
              </div>
            </div>

            {/* Other friends chat previews */}
            {filteredPeople.map((u) => (
              <div
                key={u.id}
                onClick={() => onSelectUserForChat(u)}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#161821]/70 border border-transparent hover:border-white/[0.05] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-11 h-11 rounded-full object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{u.name}</span>
                      <span className="text-[11px] text-zinc-500">{u.lastActive || "Hoje"}</span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      Toque para abrir a conversa direta...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Friend Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161822] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Adicionar Amigo</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Digite o nome de usuário ou tag para enviar uma solicitação de amizade.
            </p>
            <form onSubmit={handleAddFriend} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="ex: Awkiruun#0001"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                className="w-full bg-[#0d0e12] border border-white/10 focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563eb] hover:bg-blue-700 text-white"
                >
                  Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
