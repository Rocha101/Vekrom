import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Shield, Trash2, Users } from "lucide-react";
import type { ServerRole } from "../../stores";

type PermissionKey = keyof ServerRole["permissions"];
type Props = {
  roles: ServerRole[];
  members: Array<{ id: string; username: string }>;
  onCreate: (name: string) => ServerRole;
  onSave: (roleId: string, data: Partial<Pick<ServerRole, "name" | "color" | "permissions">>) => void;
  onDelete: (roleId: string) => void;
  onToggleMember: (roleId: string, memberId: string) => void;
};

const PERMISSIONS: Array<{ key: PermissionKey; title: string; detail: string; category: string }> = [
  { key: "viewChannels", title: "Ver canais públicos", detail: "Mostra os canais que qualquer membro pode acessar.", category: "Acesso ao servidor" },
  { key: "viewPrivateChannels", title: "Acessar canais privados", detail: "Membros com este cargo podem entrar em canais marcados como privados.", category: "Acesso ao servidor" },
  { key: "manageChannels", title: "Criar canais", detail: "Mostra a opção para criar canais de texto ou voz.", category: "Acesso ao servidor" },
  { key: "manageServer", title: "Editar perfil do servidor", detail: "Permite mudar o nome, a descrição e o ícone do servidor.", category: "Acesso ao servidor" },
  { key: "connect", title: "Entrar em chamadas", detail: "Permite entrar nos canais de voz disponíveis para o membro.", category: "Chamadas de voz" },
  { key: "muteMembers", title: "Silenciar microfone de membros", detail: "Permite silenciar ou reativar o microfone de outros membros.", category: "Moderação de membros" },
  { key: "deafenMembers", title: "Silenciar áudio de membros", detail: "Permite impedir ou restaurar a reprodução do áudio da chamada para outros membros.", category: "Moderação de membros" },
  { key: "kickMembers", title: "Expulsar membros", detail: "Permite remover membros do servidor. Eles poderão entrar novamente por convite.", category: "Moderação de membros" },
  { key: "banMembers", title: "Banir membros", detail: "Permite banir membros. Eles não poderão entrar novamente no servidor.", category: "Moderação de membros" },
];
const COLORS = ["#5865f2", "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c", "#3498db", "#9b59b6", "#e84393", "#99aab5"];

export function ServerRolesPanel({ roles, members, onCreate, onSave, onDelete, onToggleMember }: Props) {
  const safeRoles = roles.length ? roles : [{ id: "everyone", name: "Permissões padrão", color: "#9ca3af", isDefault: true, memberIds: [], permissions: { viewChannels: true, viewPrivateChannels: false, manageChannels: false, manageRoles: false, manageServer: false, manageMessages: false, connect: true, kickMembers: false, banMembers: false, muteMembers: false, deafenMembers: false } } satisfies ServerRole];
  const [selectedId, setSelectedId] = useState(safeRoles[0].id);
  const [tab, setTab] = useState<"display" | "permissions" | "members">("permissions");
  const [roleSearch, setRoleSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const role = safeRoles.find((item) => item.id === selectedId) ?? safeRoles[0];
  const [nameDraft, setNameDraft] = useState(role.name);
  const [colorDraft, setColorDraft] = useState(role.color);
  const [permissionDraft, setPermissionDraft] = useState(role.permissions);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!safeRoles.some((item) => item.id === selectedId)) setSelectedId(safeRoles[0].id);
  }, [safeRoles, selectedId]);
  useEffect(() => {
    setNameDraft(role.name);
    setColorDraft(role.color);
    setPermissionDraft(role.permissions);
  }, [role.id, role.name, role.color, role.permissions]);

  const filteredRoles = useMemo(() => safeRoles.filter((item) => item.name.toLowerCase().includes(roleSearch.toLowerCase())), [safeRoles, roleSearch]);
  const filteredPermissions = PERMISSIONS.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(permissionSearch.toLowerCase()));
  const filteredMembers = members.filter((item) => item.username.toLowerCase().includes(memberSearch.toLowerCase()));
  const save = () => {
    onSave(role.id, { name: nameDraft.trim() || role.name, color: colorDraft, permissions: permissionDraft });
    setNotice("Cargo salvo.");
    window.setTimeout(() => setNotice(""), 2000);
  };
  const addRole = () => {
    const value = newName.trim();
    if (!value) return;
    const created = onCreate(value);
    setNewName("");
    setCreating(false);
    setSelectedId(created.id);
    setTab("permissions");
  };

  return <div className="grid min-h-[540px] grid-cols-1 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1e1f22] text-[#dbdee1] lg:grid-cols-[300px_minmax(0,1fr)]">
    <aside className="border-b border-white/[0.08] bg-[#17181b] p-4 lg:border-b-0 lg:border-r">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold text-white"><Shield size={17} className="text-indigo-400"/>Cargos</div>
      <p className="mb-4 text-xs leading-relaxed text-zinc-400">Cargos agrupam membros e definem o que eles podem fazer.</p>
      <button onClick={() => { setSelectedId(safeRoles[0].id); setTab("permissions"); }} className="mb-4 flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#232428] p-3 text-left hover:border-indigo-400/50"><span><span className="block text-sm font-semibold">Cargo padrão</span><span className="text-xs text-zinc-400">Aplicado automaticamente a todos</span></span><ChevronRight size={17}/></button>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2"><Search size={15} className="text-zinc-500"/><input value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} placeholder="Filtrar cargos" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"/></div>
      {creating ? <div className="mt-3 flex gap-2"><input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRole()} placeholder="Ex.: Moderador" maxLength={40} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#232428] px-3 py-2 text-sm outline-none focus:border-indigo-400"/><button onClick={addRole} disabled={!newName.trim()} className="rounded-lg bg-indigo-500 px-3 text-sm font-semibold disabled:opacity-50">Adicionar</button></div> : <button onClick={() => setCreating(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"><Plus size={16}/> Novo cargo</button>}
      <p className="my-3 text-xs leading-relaxed text-zinc-500">Selecione um cargo para editar. Cargos personalizados são atribuídos aos membros na aba “Membros”.</p>
      <div className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[350px]">{filteredRoles.filter((item) => !item.isDefault).map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); setTab("permissions"); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${role.id === item.id ? "bg-[#303136] text-white" : "text-zinc-300 hover:bg-white/[0.05]"}`}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}/><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="text-xs text-zinc-500">{item.memberIds.length}</span></button>)}</div>
    </aside>

    <section className="min-w-0 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-white">{role.isDefault ? "Cargo padrão — todos os membros" : `Cargo: ${role.name}`}</h2><p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-400">{role.isDefault ? "As opções abaixo valem para todas as pessoas do servidor. O dono sempre mantém acesso total." : "Escolha o que as pessoas com este cargo podem fazer."}</p></div>{!role.isDefault && <button onClick={() => { onDelete(role.id); setSelectedId(safeRoles[0].id); }} className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-rose-300 hover:bg-rose-500/10"><Trash2 size={15}/> Excluir cargo</button>}</div>
      <div className="mt-5 flex gap-5 overflow-x-auto border-b border-white/10 text-sm">{([{ id: "display", label: "Nome e cor" }, { id: "permissions", label: "Permissões" }, { id: "members", label: role.isDefault ? "Quem recebe" : `Membros (${role.memberIds.length})` }] as const).map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 border-b-2 px-1 pb-2.5 ${tab === item.id ? "border-indigo-400 font-semibold text-indigo-300" : "border-transparent text-zinc-400 hover:text-white"}`}>{item.label}</button>)}</div>

      {tab === "display" && <div className="mt-6 max-w-xl space-y-5"><label className="block text-sm font-semibold">Nome do cargo<input disabled={role.isDefault} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={40} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#232428] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 disabled:opacity-60"/></label><div><p className="text-sm font-semibold">Cor do cargo</p><div className="mt-3 flex flex-wrap gap-2">{COLORS.map((color) => <button key={color} onClick={() => setColorDraft(color)} aria-label={`Cor ${color}`} className={`h-8 w-8 rounded-full border-2 ${colorDraft === color ? "border-white" : "border-transparent"}`} style={{ backgroundColor: color }}/>)}</div></div><button onClick={save} className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white">Salvar exibição</button></div>}

      {tab === "permissions" && <div className="mt-5"><div className="mb-4 flex flex-wrap items-center gap-2"><div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#232428] px-3 py-2"><Search size={15} className="text-zinc-500"/><input value={permissionSearch} onChange={(e) => setPermissionSearch(e.target.value)} placeholder="Buscar uma permissão" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"/></div><button onClick={() => setPermissionDraft(Object.fromEntries(Object.keys(permissionDraft).map((key) => [key, false])) as ServerRole["permissions"])} className="rounded-lg px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/10">Desativar todas</button></div><p className="mb-4 text-xs text-zinc-500">Ative apenas o que os membros com este cargo devem poder fazer.</p><div className="max-h-[340px] overflow-y-auto pr-2">{Array.from(new Set(filteredPermissions.map((item) => item.category))).map((category) => <div key={category} className="mb-4"><h3 className="mb-1 py-2 text-base font-semibold text-white">{category}</h3>{filteredPermissions.filter((item) => item.category === category).map((permission) => <label key={permission.key} className="flex cursor-pointer items-start justify-between gap-4 border-b border-white/[0.08] py-4"><span><span className="block text-sm font-semibold text-zinc-200">{permission.title}</span><span className="mt-1 block max-w-xl text-xs text-zinc-400">{permission.detail}</span></span><span className="flex shrink-0 items-center gap-2 text-[11px] text-zinc-400"><span>{permissionDraft[permission.key] ? "Permitido" : "Bloqueado"}</span><input type="checkbox" aria-label={`${permission.title}: ${permissionDraft[permission.key] ? "permitido" : "bloqueado"}`} checked={permissionDraft[permission.key]} onChange={(e) => setPermissionDraft({ ...permissionDraft, [permission.key]: e.target.checked })} className="h-5 w-5 accent-indigo-500"/></span></label>)}</div>)}</div><div className="mt-4 flex items-center justify-end gap-3">{notice && <span role="status" className="text-sm text-emerald-300">{notice}</span>}<button onClick={save} className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400">Salvar alterações</button></div></div>}

      {tab === "members" && <div className="mt-5">{role.isDefault ? <div className="flex items-start gap-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4"><Users size={18} className="mt-0.5 text-indigo-300"/><div><h3 className="text-sm font-semibold text-white">Todos os membros recebem este cargo</h3><p className="mt-1 text-xs leading-relaxed text-zinc-300">Este é o cargo base do servidor. Para dar permissões diferentes a alguém, crie outro cargo e escolha os membros aqui.</p></div></div> : <><div className="flex flex-wrap gap-3"><div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#232428] px-3 py-2"><Search size={15} className="text-zinc-500"/><input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Buscar membro pelo nome" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"/></div><span className="flex items-center gap-1 text-xs text-zinc-400"><Users size={14}/>{role.memberIds.length} selecionados</span></div><p className="mt-3 text-xs text-zinc-500">Marque as pessoas que devem receber este cargo.</p><div className="mt-3 max-h-[340px] space-y-1 overflow-y-auto">{filteredMembers.map((member) => { const assigned = role.memberIds.includes(member.id); return <label key={member.id} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/[0.04]"><span className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200">{member.username.slice(0, 2).toUpperCase()}</span><span className="text-sm font-semibold text-white">{member.username}</span></span><input type="checkbox" checked={assigned} onChange={() => onToggleMember(role.id, member.id)} className="h-4 w-4 accent-indigo-500"/></label>; })}</div></>}</div>}
    </section>
  </div>;
}
