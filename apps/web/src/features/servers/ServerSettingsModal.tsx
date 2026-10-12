import { useRef, useState } from "react";
import { Camera, Check, ChevronLeft, ImagePlus, LogOut, Save, Settings, Shield, Users, X } from "lucide-react";
import type { Server } from "../../lib/api";
import type { ServerRole } from "../../stores";
import { ServerRolesPanel } from "./ServerRolesPanel";

type ServerSettingsModalProps = {
  isOpen: boolean;
  server: Server;
  isOwner: boolean;
  canEditServer: boolean;
  onClose: () => void;
  onSave: (data: { name: string; iconUrl: string | null; description: string }) => void;
  onLeave: () => void;
  roles: ServerRole[];
  members: Array<{ id: string; username: string }>;
  onCreateRole: (name: string) => ServerRole;
  onSaveRole: (roleId: string, data: Partial<Pick<ServerRole, "name" | "color" | "permissions">>) => void;
  onDeleteRole: (roleId: string) => void;
  onToggleRoleMember: (roleId: string, memberId: string) => void;
};

const sections = [
  { id: "profile", title: "Perfil do servidor", icon: ImagePlus },
  { id: "members", title: "Membros", icon: Users },
  { id: "roles", title: "Cargos", icon: Shield },
  { id: "access", title: "Acesso e permissões", icon: Shield },
];

export function ServerSettingsModal({ isOpen, server, isOwner, canEditServer, onClose, onSave, onLeave, roles, members, onCreateRole, onSaveRole, onDeleteRole, onToggleRoleMember }: ServerSettingsModalProps) {
  const [section, setSection] = useState("profile");
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description ?? "");
  const [iconUrl, setIconUrl] = useState(server.iconUrl);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const save = () => {
    onSave({ name: name.trim() || server.name, description: description.trim(), iconUrl });
    setNotice("Alterações salvas neste dispositivo.");
    window.setTimeout(() => setNotice(""), 2500);
  };

  const chooseIcon = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setIconUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-[#1e1f22] text-[#dbdee1]">
      <button className="absolute right-6 top-5 z-10 rounded-full border-2 border-zinc-500 p-2 text-zinc-400 hover:text-white" onClick={onClose} aria-label="Fechar configurações"><X size={19} /></button>
      <aside className="hidden w-[280px] shrink-0 flex-col bg-[#17181b] px-6 py-8 md:flex">
        <div className="mb-7 px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{server.name}</div>
        {sections.map(({ id, title, icon: Icon }) => (
          <button key={id} onClick={() => setSection(id)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm ${section === id ? "bg-[#303136] text-white" : "text-zinc-300 hover:bg-white/[0.05]"}`}>
            <Icon size={16} /> {title}
          </button>
        ))}
        <div className="my-5 border-t border-white/[0.08]" />
        <button onClick={onLeave} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-rose-400 hover:bg-rose-500/10"><LogOut size={16} /> Sair do servidor</button>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-5 pb-10 pt-16 sm:px-10 md:pt-10">
        <div className="mx-auto max-w-4xl">
          <button onClick={onClose} className="mb-5 flex items-center gap-1 text-sm text-zinc-400 hover:text-white md:hidden"><ChevronLeft size={17} /> Voltar</button>
          <div className="mb-8 flex items-center gap-3"><Settings size={21} className="text-indigo-400"/><div><h1 className="text-xl font-bold text-white">Configurações do servidor</h1><p className="text-sm text-zinc-400">Gerencie a identidade e o acesso de {server.name}.</p></div></div>
          <nav className="mb-6 flex gap-2 overflow-x-auto md:hidden">{sections.map(({ id, title }) => <button key={id} onClick={() => setSection(id)} className={`shrink-0 rounded-full px-3 py-2 text-xs ${section === id ? "bg-indigo-500 text-white" : "bg-[#303136] text-zinc-300"}`}>{title}</button>)}</nav>

          {section === "profile" && <section className="max-w-2xl space-y-7">
            <div><h2 className="text-lg font-semibold text-white">Perfil do servidor</h2><p className="mt-1 text-sm text-zinc-400">Personalize como sua comunidade aparece para os membros.</p></div>
            <label className="block text-sm font-semibold text-white">Nome do servidor<input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEditServer} maxLength={80} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#17181b] px-3.5 py-3 font-normal text-white outline-none focus:border-indigo-400 disabled:opacity-60" /></label>
            <label className="block text-sm font-semibold text-white">Descrição<textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEditServer} rows={3} maxLength={300} placeholder="Conte um pouco sobre este servidor" className="mt-2 block w-full resize-none rounded-lg border border-white/10 bg-[#17181b] px-3.5 py-3 font-normal text-white outline-none placeholder:text-zinc-500 focus:border-indigo-400 disabled:opacity-60"/><span className="mt-1 block text-xs font-normal text-zinc-500">{description.length}/300</span></label>
            <div className="border-t border-white/10 pt-6"><h3 className="font-semibold text-white">Ícone do servidor</h3><p className="mt-1 text-sm text-zinc-400">Escolha uma imagem para identificar seu servidor.</p><div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-[#303136] text-xl font-bold text-white">{iconUrl ? <img src={iconUrl} alt="Ícone do servidor" className="h-full w-full object-cover"/> : server.name.slice(0,2).toUpperCase()}</div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => chooseIcon(e.target.files?.[0])}/>
              <div className="flex gap-2"><button disabled={!canEditServer} onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"><Camera size={16}/> Alterar ícone</button>{iconUrl && <button disabled={!canEditServer} onClick={() => setIconUrl(null)} className="rounded-md bg-[#303136] px-4 py-2.5 text-sm text-rose-300 hover:bg-[#3a3b40] disabled:opacity-50">Remover</button>}</div>
            </div></div>
            {!canEditServer && <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">Seu cargo não permite alterar o nome, a descrição ou o ícone.</p>}
          </section>}

          {section === "members" && <section className="max-w-2xl"><h2 className="text-lg font-semibold text-white">Membros</h2><div className="mt-4 rounded-xl border border-white/[0.08] bg-[#232428] p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-500/20 text-indigo-300"><Users size={18}/></div><div><p className="font-semibold text-white">Membros do servidor</p><p className="text-sm text-zinc-400">Atribua cargos pela aba Cargos do servidor.</p></div></div><div className="mt-5 border-t border-white/10 pt-4 text-sm text-zinc-300">{members.length} membros disponíveis para atribuição de cargos.</div></div></section>}

          {section === "roles" && <section><h2 className="mb-1 text-lg font-semibold text-white">Cargos</h2><p className="mb-5 text-sm text-zinc-400">Agrupe membros e defina as permissões de cada cargo.</p>{isOwner ? <ServerRolesPanel roles={roles} members={members} onCreate={onCreateRole} onSave={onSaveRole} onDelete={onDeleteRole} onToggleMember={onToggleRoleMember}/> : <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">Somente o dono do servidor pode criar cargos, atribuir membros e editar permissões.</div>}</section>}

          {section === "access" && <section className="max-w-2xl"><h2 className="text-lg font-semibold text-white">Acesso e permissões</h2><p className="mt-1 text-sm text-zinc-400">As opções administrativas são exclusivas do proprietário.</p><div className="mt-5 space-y-3">{[{ title: "Editar perfil do servidor", detail: "Alterar nome, descrição e ícone", allowed: isOwner }, { title: "Gerenciar membros e cargos", detail: "Controlar quem participa e o que pode fazer", allowed: isOwner }, { title: "Acessar canais e conversar", detail: "Disponível para membros do servidor", allowed: true }].map((item) => <div key={item.title} className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#232428] p-4"><div><p className="text-sm font-semibold text-white">{item.title}</p><p className="mt-1 text-xs text-zinc-400">{item.detail}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.allowed ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-400"}`}>{item.allowed ? "Permitido" : "Somente dono"}</span></div>)}</div></section>}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button onClick={onLeave} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 md:hidden"><LogOut size={16}/> Sair do servidor</button>
            <div className="ml-auto flex items-center gap-3">{notice && <span className="flex items-center gap-1.5 text-sm text-emerald-300"><Check size={15}/>{notice}</span>}{section === "profile" && <button disabled={!canEditServer} onClick={save} className="flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"><Save size={16}/> Salvar alterações</button>}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
