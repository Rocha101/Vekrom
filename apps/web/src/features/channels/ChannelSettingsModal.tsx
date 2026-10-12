import { useEffect, useState } from "react";
import { Hash, LockKeyhole, Save, Shield, Trash2, Users, Volume2, X } from "lucide-react";
import type { Channel } from "../../lib/api";

type Props = {
  channel: Channel;
  isOwner: boolean;
  onClose: () => void;
  onSave: (data: { name: string; isPrivate: boolean; userLimit?: number }) => void;
  onDelete: () => void;
};

export function ChannelSettingsModal({ channel, isOwner, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(channel.name);
  const [isPrivate, setIsPrivate] = useState(channel.isPrivate ?? false);
  const [userLimit, setUserLimit] = useState(channel.userLimit ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isVoice = channel.type === "voice";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    try {
      onSave({ name: name.trim() || channel.name, isPrivate, userLimit: isVoice && userLimit > 0 ? userLimit : 0 });
      setSaveError("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    }
  };

  return <div className="fixed inset-0 z-[110] flex bg-[#1e1f22] text-[#dbdee1]">
    <aside className="hidden w-[290px] shrink-0 flex-col bg-[#17181b] px-7 py-10 md:flex">
      <div className="mb-5 flex items-center gap-2 text-xs font-extrabold uppercase text-zinc-300">{isVoice ? <Volume2 size={15}/> : <Hash size={15}/>} {channel.name}</div>
      <div className="rounded-md bg-[#303136] px-3 py-2 text-sm font-semibold text-white">Visão geral</div>
      <div className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-zinc-400"><Shield size={15}/> Permissões</div>
      <div className="mt-auto border-t border-white/10 pt-4">
        {!isOwner && <p className="mb-3 text-xs text-zinc-500">Apenas o dono pode excluir este canal.</p>}
        {!confirmDelete ? <button disabled={!isOwner} onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"><span>Excluir canal</span><Trash2 size={15}/></button> : <div className="space-y-2 rounded-lg bg-rose-500/10 p-3"><p className="text-xs text-rose-200">Excluir #{channel.name}? Esta ação não pode ser desfeita.</p><div className="flex gap-2"><button onClick={() => setConfirmDelete(false)} className="flex-1 rounded bg-white/10 py-1.5 text-xs">Cancelar</button><button onClick={onDelete} className="flex-1 rounded bg-rose-600 py-1.5 text-xs font-bold text-white">Excluir</button></div></div>}
      </div>
    </aside>

    <main className="min-w-0 flex-1 overflow-y-auto px-5 pb-10 pt-16 sm:px-10 md:pt-12">
      <button className="absolute right-6 top-5 rounded-full border-2 border-zinc-500 p-2 text-zinc-400 hover:text-white" onClick={onClose} aria-label="Fechar"><X size={19}/></button>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-white">Visão geral</h1>
        <p className="mt-1 text-sm text-zinc-400">Configurações de #{channel.name}</p>
        <section className="mt-8 space-y-7">
          <label className="block text-sm font-semibold text-white">Nome do canal<input value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} maxLength={80} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#232428] px-3.5 py-3 font-normal text-white outline-none focus:border-indigo-400 disabled:opacity-60"/></label>
          <div><h2 className="text-sm font-semibold text-white">Visibilidade</h2><p className="mt-1 text-xs text-zinc-400">Canais privados ficam restritos a membros autorizados. Controle de cargos pode ser configurado em Permissões.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[{ value: false, label: "Público", desc: "Todos os membros podem acessar.", icon: Users }, { value: true, label: "Privado", desc: "Acesso restrito a membros autorizados.", icon: LockKeyhole }].map(({ value, label, desc, icon: Icon }) => <button key={label} disabled={!isOwner} onClick={() => setIsPrivate(value)} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${isPrivate === value ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 bg-[#232428] hover:border-white/20"}`}><Icon size={18} className={isPrivate === value ? "text-indigo-300" : "text-zinc-400"}/><span><span className="block text-sm font-semibold text-white">{label}</span><span className="mt-1 block text-xs text-zinc-400">{desc}</span></span></button>)}
          </div></div>
          {isVoice && <label className="block text-sm font-semibold text-white">Limite de participantes na chamada<div className="mt-2 flex items-center gap-3"><input type="number" min={0} max={99} value={userLimit} onChange={(e) => setUserLimit(Math.min(99, Math.max(0, Number(e.target.value))))} disabled={!isOwner} className="w-32 rounded-lg border border-white/10 bg-[#232428] px-3.5 py-3 font-normal text-white outline-none focus:border-indigo-400 disabled:opacity-60"/><span className="text-xs font-normal text-zinc-400">0 = sem limite (máximo 99)</span></div></label>}
          {!isOwner && <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">Somente o dono do servidor pode editar as configurações e excluir canais.</p>}
        </section>
        <div className="mt-4 space-y-1 md:hidden">{saveError && <p role="alert" className="text-sm text-rose-300">{saveError}</p>}{saved && <p role="status" className="text-sm text-emerald-300">Alterações salvas.</p>}</div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 md:hidden">
          {!confirmDelete ? <button disabled={!isOwner} onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 disabled:opacity-40"><Trash2 size={16}/> Excluir canal</button> : <div className="flex items-center gap-2"><span className="text-xs text-rose-200">Excluir canal?</span><button onClick={() => setConfirmDelete(false)} className="rounded bg-white/10 px-2 py-1.5 text-xs">Cancelar</button><button onClick={onDelete} className="rounded bg-rose-600 px-2 py-1.5 text-xs font-bold">Excluir</button></div>}
          <button disabled={!isOwner} onClick={save} className="ml-auto flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16}/> Salvar</button>
        </div>
        <div className="mt-10 hidden items-center justify-end gap-3 border-t border-white/10 pt-5 md:flex">{saveError && <span role="alert" className="text-sm text-rose-300">{saveError}</span>}{saved && <span role="status" className="text-sm text-emerald-300">Alterações salvas.</span>}<button disabled={!isOwner} onClick={save} className="flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"><Save size={16}/> Salvar alterações</button></div>
        {confirmDelete && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 md:hidden"><div className="w-full max-w-sm rounded-xl bg-[#232428] p-5"><h2 className="font-bold text-white">Excluir canal</h2><p className="mt-2 text-sm text-zinc-300">Tem certeza que deseja excluir #{channel.name}? Essa ação não pode ser desfeita.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmDelete(false)} className="rounded-md px-3 py-2 text-sm text-zinc-300">Cancelar</button><button onClick={onDelete} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Excluir canal</button></div></div></div>}
      </div>
    </main>
  </div>;
}
