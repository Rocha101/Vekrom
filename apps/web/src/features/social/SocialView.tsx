import React, { useState } from "react";
import { ChevronLeft, MoreHorizontal, Search, MessageSquare, UserPlus, Users } from "lucide-react";
import type { SocialUser } from "../../lib/types";

interface SocialViewProps {
  onBack?: () => void;
  friends: SocialUser[];
  onSelectUserForChat: (user: SocialUser) => void;
  onAddFriend: (username: string) => Promise<void>;
}

export function SocialView({ onBack, friends, onSelectUserForChat, onAddFriend }: SocialViewProps) {
  const [activeTab, setActiveTab] = useState<"friends" | "chats">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [requestError, setRequestError] = useState("");
  const filteredFriends = friends.filter((friend) => `${friend.name} ${friend.handle}`.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddFriend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newFriendName.trim()) return;
    setRequestError("");
    try {
      await onAddFriend(newFriendName.trim());
      setSuccessToast("Solicitação de amizade enviada.");
      setNewFriendName("");
      setShowAddModal(false);
      setTimeout(() => setSuccessToast(""), 4000);
    } catch {
      setRequestError("Não foi possível enviar a solicitação. Confira o nome e tente novamente.");
    }
  };

  const avatar = (user: SocialUser, size = "h-11 w-11") => user.avatar
    ? <img src={user.avatar} alt={user.name} className={`${size} rounded-full border border-white/10 object-cover`} />
    : <span aria-label={user.name} className={`grid ${size} place-items-center rounded-full border border-white/10 bg-[#242631] text-sm font-semibold text-zinc-200`}>{user.name.slice(0, 2).toUpperCase()}</span>;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] overflow-y-auto scroll-thin pb-24 md:pb-6">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0d0e12]/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          {onBack && <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-full text-white/80 hover:bg-white/10" aria-label="Voltar"><ChevronLeft size={24} /></button>}
          <Users size={20} className="text-[#2563eb]" />
          <h1 className="text-base font-bold text-white tracking-wide">Amigos & Social</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="p-2 -mr-2 rounded-full text-white/80 hover:bg-white/10" aria-label="Adicionar amigo"><MoreHorizontal size={22} /></button>
      </header>

      {successToast && <div role="status" className="mx-4 mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-3 text-xs text-emerald-300">{successToast}</div>}

      <div className="border-b border-white/[0.08] px-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center">
          {(["friends", "chats"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`relative flex-1 py-3 text-center text-sm font-bold ${activeTab === tab ? "text-white" : "text-zinc-400 hover:text-zinc-200"}`}>{tab === "friends" ? "Amigos" : "Conversas"}{activeTab === tab && <span className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full bg-[#2563eb]" />}</button>)}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto w-full flex items-center gap-2">
        <div className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar amigos" className="w-full rounded-xl border border-white/[0.06] bg-[#161821] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#2563eb]/60" /></div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#1b1e2a] p-2 text-xs font-bold text-zinc-300 hover:bg-[#2563eb] hover:text-white"><UserPlus size={16} /><span className="hidden sm:inline">Adicionar Amigo</span></button>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-4">
        {activeTab === "friends" ? <>
          <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-zinc-400">Amigos ({filteredFriends.length})</h2>
          {filteredFriends.length === 0 ? <p className="rounded-xl border border-white/[0.06] p-5 text-center text-sm text-zinc-400">{searchQuery ? "Nenhum amigo encontrado." : "Você ainda não tem amigos adicionados."}</p> : <div className="divide-y divide-white/[0.04]">{filteredFriends.map((user) => <div key={user.id} className="group flex items-center justify-between rounded-xl px-2 py-3 hover:bg-[#161821]/80">
            <button onClick={() => onSelectUserForChat(user)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">{avatar(user)}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white group-hover:text-blue-400">{user.name}</span><span className="block truncate text-xs text-zinc-400">{user.handle}</span></span></button>
            <button onClick={() => onSelectUserForChat(user)} className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white" title={`Enviar mensagem para ${user.name}`}><MessageSquare size={18} /></button>
          </div>)}</div>}
        </> : <p className="rounded-xl border border-white/[0.06] p-5 text-center text-sm text-zinc-400">As conversas aparecerão aqui quando houver mensagens diretas.</p>}
      </div>

      {showAddModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"><div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161822] p-6 shadow-2xl">
        <h3 className="mb-2 text-base font-bold text-white">Adicionar Amigo</h3><p className="mb-4 text-xs text-zinc-400">Digite o nome de usuário para enviar uma solicitação de amizade.</p>
        <form onSubmit={handleAddFriend} className="space-y-4">{requestError && <p role="alert" className="text-xs text-rose-300">{requestError}</p>}<input autoFocus placeholder="Nome de usuário" value={newFriendName} onChange={(event) => setNewFriendName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0e12] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">Cancelar</button><button type="submit" className="rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Enviar Solicitação</button></div>
        </form>
      </div></div>}
    </div>
  );
}
