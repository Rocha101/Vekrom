import { useEffect, useState } from "react";
import { Ban, Headphones, MessageCircle, MicOff, UserRoundX, X } from "lucide-react";
import type { ServerMember } from "./MemberList";

interface Props {
  member: ServerMember;
  serverName: string;
  onClose: () => void;
  onMessage: (member: ServerMember) => void;
  canModerateTarget: boolean;
  canKick: boolean;
  canBan: boolean;
  canMuteVoice: boolean;
  canMuteSound: boolean;
  onModerate: (member: ServerMember, action: "kick" | "ban" | "voice_mute" | "sound_mute", enabled?: boolean) => Promise<void>;
}

export function MemberProfileModal({ member, serverName, onClose, onMessage, canModerateTarget, canKick, canBan, canMuteVoice, canMuteSound, onModerate }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={`Perfil de ${member.username}`} className="relative w-full max-w-[360px] overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#101114] shadow-2xl sm:rounded-3xl">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-indigo-500/30 via-[#262834] to-[#101114]" />
      <div className="relative flex justify-end gap-2 p-3">
        <button onClick={onClose} aria-label="Fechar perfil" className="rounded-full bg-black/40 p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"><X size={17}/></button>
      </div>
      <div className="relative px-5 pb-5">
        <div className="relative inline-block">
          {member.avatar ? <img src={member.avatar} alt={`Foto de ${member.username}`} className="h-24 w-24 rounded-full border-[5px] border-[#101114] bg-[#242631] object-cover shadow-xl"/> : <span className="grid h-24 w-24 place-items-center rounded-full border-[5px] border-[#101114] bg-[#242631] text-2xl font-bold text-zinc-200">{member.username.slice(0, 2).toUpperCase()}</span>}
          {member.status !== "unknown" && <span className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-[#101114] ${member.status === "offline" ? "bg-zinc-500" : member.status === "dnd" ? "bg-rose-400" : member.status === "idle" ? "bg-amber-400" : member.status === "streaming" ? "bg-violet-400" : "bg-emerald-400"}`} />}
        </div>
        <h2 className="mt-2 text-xl font-extrabold text-white">{member.username}</h2>
        <p className="text-sm text-zinc-400">{member.handle}</p>
        {member.bio && <p className="mt-3 text-sm leading-relaxed text-zinc-300">{member.bio}</p>}

        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400"/>Membro de <span className="truncate font-semibold text-zinc-200">{serverName}</span></div>

        {member.roleNames.length > 0 && <div className="mt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cargos</p><div className="flex flex-wrap gap-2">{member.roleNames.map((role) => <span key={role.name} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-200"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }}/>{role.name}</span>)}</div></div>}

        {canModerateTarget && <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Moderação do servidor</p>
          {canMuteVoice && <button disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await onModerate(member, "voice_mute", !member.voiceMuted); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar o microfone."); } finally { setBusy(false); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"><MicOff size={16} className="text-amber-300"/>{member.voiceMuted ? "Ativar microfone do membro" : "Silenciar microfone"}</button>}
          {canMuteSound && <button disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await onModerate(member, "sound_mute", !member.soundMuted); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar o áudio."); } finally { setBusy(false); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"><Headphones size={16} className="text-indigo-300"/>{member.soundMuted ? "Restaurar áudio do membro" : "Silenciar áudio do membro"}</button>}
          {(canKick || canBan) && <div className="my-1 border-t border-white/[0.07]"/>}
          {canKick && <button disabled={busy} onClick={async () => { if (!window.confirm(`Expulsar ${member.username} deste servidor?`)) return; setBusy(true); setError(""); try { await onModerate(member, "kick"); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível expulsar o membro."); } finally { setBusy(false); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><UserRoundX size={16}/>Expulsar do servidor</button>}
          {canBan && <button disabled={busy} onClick={async () => { if (!window.confirm(`Banir ${member.username} deste servidor? A pessoa não poderá entrar novamente.`)) return; setBusy(true); setError(""); try { await onModerate(member, "ban"); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível banir o membro."); } finally { setBusy(false); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><Ban size={16}/>Banir do servidor</button>}
          {error && <p role="alert" className="px-2 pt-2 text-xs text-rose-300">{error}</p>}
        </div>}
        <button onClick={() => onMessage(member)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#27282d] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#34353b]"><MessageCircle size={17}/>Conversar com {member.handle}</button>
      </div>
    </section>
  </div>;
}
