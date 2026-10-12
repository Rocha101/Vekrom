import React, { useMemo, useState } from "react";
import { Check, Clock3, MessageSquare, Search, UserPlus, Users, X } from "lucide-react";
import type { SocialUser } from "../../lib/types";

interface PendingFriendRequest extends SocialUser {
  friendshipId: string;
  direction: "incoming" | "outgoing";
}

interface SocialViewProps {
  onBack?: () => void;
  friends: SocialUser[];
  pendingRequests: PendingFriendRequest[];
  onSelectUserForChat: (user: SocialUser) => void;
  onAddFriend: (username: string) => Promise<void>;
  onAcceptRequest: (friendshipId: string) => Promise<void>;
  onRemoveRequest: (friendshipId: string) => Promise<void>;
}

export function SocialView({ onBack, friends, pendingRequests, onSelectUserForChat, onAddFriend, onAcceptRequest, onRemoveRequest }: SocialViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const incoming = pendingRequests.filter((request) => request.direction === "incoming");
  const outgoing = pendingRequests.filter((request) => request.direction === "outgoing");
  const filteredFriends = useMemo(() => friends.filter((friend) => `${friend.name} ${friend.handle}`.toLowerCase().includes(searchQuery.toLowerCase())), [friends, searchQuery]);
  const filteredIncoming = incoming.filter((friend) => `${friend.name} ${friend.handle}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOutgoing = outgoing.filter((friend) => `${friend.name} ${friend.handle}`.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddFriend = async (event: React.FormEvent) => {
    event.preventDefault();
    const username = newFriendName.trim();
    if (!username) return;
    setFeedback(null);
    try {
      await onAddFriend(username);
      setFeedback({ text: "Pedido de amizade enviado.", error: false });
      setNewFriendName("");
      setShowAddModal(false);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const text = code.includes("user_not_found") ? "Não encontramos essa conta. Confira o nome e o discriminador." :
        code.includes("use_discriminator") ? "Há mais de uma conta com esse nome. Informe também #0000." :
        code.includes("incoming_request_exists") ? "Essa pessoa já enviou um pedido. Aceite-o na aba Pendente." :
        code.includes("already_friends") ? "Vocês já são amigos." :
        code.includes("request_exists") ? "Você já enviou um pedido para essa pessoa." : "Não foi possível enviar o pedido. Tente novamente.";
      setFeedback({ text, error: true });
    }
  };

  const runRequestAction = async (friendshipId: string, action: () => Promise<void>, successText: string) => {
    setBusyRequestId(friendshipId);
    setFeedback(null);
    try {
      await action();
      setFeedback({ text: successText, error: false });
      return true;
    } catch {
      setFeedback({ text: "Não foi possível atualizar o pedido. Tente novamente.", error: true });
      return false;
    } finally {
      setBusyRequestId(null);
    }
  };

  const avatar = (user: SocialUser) => user.avatar
    ? <img src={user.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full border border-white/10 object-cover" />
    : <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-[#242631] text-sm font-semibold text-zinc-200">{user.name.slice(0, 2).toUpperCase()}</span>;

  const renderRequest = (request: PendingFriendRequest, direction: "incoming" | "outgoing") => {
    const busy = busyRequestId === request.friendshipId;
    return <div key={request.friendshipId} className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-[#15171d] px-3 py-3 transition-colors hover:border-white/10 hover:bg-[#1b1d24]">
      {avatar(request)}
      <button onClick={() => onSelectUserForChat(request)} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold text-white">{request.name}</span>
        <span className="block truncate text-xs text-zinc-400">{request.handle}</span>
      </button>
      {direction === "incoming" ? <>
        <button disabled={busy} onClick={() => void (async () => { const accepted = await runRequestAction(request.friendshipId, () => onAcceptRequest(request.friendshipId), `Você e ${request.name} agora são amigos.`); if (accepted) { setActiveTab("all"); setSearchQuery(""); } })()} className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500 text-white transition-colors hover:bg-indigo-400 disabled:opacity-50" title="Aceitar pedido" aria-label={`Aceitar pedido de ${request.name}`}><Check size={17}/></button>
        <button disabled={busy} onClick={() => void runRequestAction(request.friendshipId, () => onRemoveRequest(request.friendshipId), "Pedido recusado.")} className="grid h-9 w-9 place-items-center rounded-lg bg-[#24262e] text-zinc-300 transition-colors hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50" title="Recusar pedido" aria-label={`Recusar pedido de ${request.name}`}><X size={17}/></button>
      </> : <>
        <span className="hidden items-center gap-1.5 rounded-lg bg-[#22242b] px-3 py-2 text-xs text-zinc-400 sm:flex"><Clock3 size={14}/> Aguardando</span>
        <button disabled={busy} onClick={() => void runRequestAction(request.friendshipId, () => onRemoveRequest(request.friendshipId), "Pedido cancelado.")} className="grid h-9 w-9 place-items-center rounded-lg bg-[#24262e] text-zinc-300 transition-colors hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50" title="Cancelar pedido" aria-label={`Cancelar pedido para ${request.name}`}><X size={17}/></button>
      </>}
    </div>;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0d0e12] pb-24 md:pb-6">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#0d0e12]/95 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5"><Users size={19} className="text-zinc-400"/><h1 className="text-base font-bold text-white">Amigos</h1></div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"><UserPlus size={16}/><span>Adicionar amigo</span></button>
      </header>

      {feedback && <div role={feedback.error ? "alert" : "status"} className={`mx-auto mt-3 w-full max-w-3xl px-5 text-sm ${feedback.error ? "text-rose-300" : "text-emerald-300"}`}>{feedback.text}</div>}

      <div className="mx-auto flex w-full max-w-3xl items-center gap-1 border-b border-white/[0.08] px-5">
        {(["all", "pending"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab ? "text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
          {tab === "all" ? "Todos" : <>Pendente{pendingRequests.length > 0 && <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] leading-none text-white">{pendingRequests.length}</span>}</>}
          {activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-400"/>}
        </button>)}
      </div>

      <div className="mx-auto w-full max-w-3xl px-5 pt-4">
        <div className="relative"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"/><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar" className="w-full rounded-xl border border-white/[0.08] bg-[#17191f] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-indigo-400/60"/></div>
      </div>

      <main className="mx-auto w-full max-w-3xl space-y-6 px-5 py-5">
        {activeTab === "all" ? <section>
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Todos os amigos — {filteredFriends.length}</h2>
          {filteredFriends.length === 0 ? <div className="rounded-xl border border-white/[0.06] bg-[#12141a] px-4 py-8 text-center text-sm text-zinc-400">{searchQuery ? "Nenhum amigo encontrado." : "Você ainda não tem amigos. Adicione alguém pelo nome de usuário."}</div> : <div className="space-y-2">{filteredFriends.map((user) => <div key={user.id} className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-[#15171d] px-3 py-3 transition-colors hover:border-white/10 hover:bg-[#1b1d24]">{avatar(user)}<button onClick={() => onSelectUserForChat(user)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-white">{user.name}</span><span className="block truncate text-xs text-zinc-400">{user.handle}</span></button><button onClick={() => onSelectUserForChat(user)} className="flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-indigo-500 hover:text-white" title={`Enviar mensagem para ${user.name}`} aria-label={`Conversar com ${user.name}`}><MessageSquare size={17}/><span>Mensagem</span></button></div>)}</div>}
        </section> : <>
          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Recebidos — {filteredIncoming.length}</h2>
            {filteredIncoming.length === 0 ? <p className="rounded-xl border border-white/[0.06] bg-[#12141a] px-4 py-5 text-sm text-zinc-500">Nenhum pedido recebido.</p> : <div className="space-y-2">{filteredIncoming.map((request) => renderRequest(request, "incoming"))}</div>}
          </section>
          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Enviados — {filteredOutgoing.length}</h2>
            {filteredOutgoing.length === 0 ? <p className="rounded-xl border border-white/[0.06] bg-[#12141a] px-4 py-5 text-sm text-zinc-500">Nenhum pedido enviado.</p> : <div className="space-y-2">{filteredOutgoing.map((request) => renderRequest(request, "outgoing"))}</div>}
          </section>
        </>}
      </main>

      {showAddModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddModal(false); }}><div role="dialog" aria-modal="true" aria-labelledby="add-friend-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#191b22] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between"><div><h3 id="add-friend-title" className="text-lg font-bold text-white">Adicionar amigo</h3><p className="mt-1 text-sm text-zinc-400">Envie um pedido usando o nome de usuário.</p></div><button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Fechar"><X size={18}/></button></div>
        <form onSubmit={handleAddFriend} className="space-y-4"><label className="block text-xs font-semibold text-zinc-300">Nome de usuário<input autoFocus value={newFriendName} onChange={(event) => setNewFriendName(event.target.value)} placeholder="exemplo ou exemplo#0001" maxLength={40} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/70"/></label>
          <p className="text-xs leading-relaxed text-zinc-500">Se houver contas com o mesmo nome, informe também o código após #.</p>
          <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06]">Cancelar</button><button type="submit" disabled={!newFriendName.trim()} className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">Enviar pedido</button></div>
        </form>
      </div></div>}
    </div>
  );
}
