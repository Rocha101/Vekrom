import { ChevronRight, CircleDot, Crown } from "lucide-react";

export interface ServerMember {
  id: string;
  username: string;
  avatar: string;
  handle: string;
  status: "online" | "idle" | "offline" | "dnd" | "streaming" | "unknown";
  bio?: string;
  voiceMuted?: boolean;
  soundMuted?: boolean;
  roleNames: Array<{ name: string; color: string }>;
}

interface MemberListProps {
  members: ServerMember[];
  onSelectMember: (member: ServerMember) => void;
}

const statusMeta = {
  online: { label: "Disponível", dot: "bg-emerald-400" },
  idle: { label: "Ausente", dot: "bg-amber-400" },
  offline: { label: "Offline", dot: "bg-zinc-500" },
  dnd: { label: "Não perturbe", dot: "bg-rose-400" },
  streaming: { label: "Ao vivo", dot: "bg-violet-400" },
  unknown: { label: "Status indisponível", dot: "bg-zinc-600" },
};

export function MemberList({ members, onSelectMember }: MemberListProps) {
  const roleGroups = new Map<string, { color: string; members: ServerMember[] }>();
  for (const member of members) {
    const role = member.roleNames[0] ?? { name: "Sem cargo", color: "#71717a" };
    const group = roleGroups.get(role.name) ?? { color: role.color, members: [] };
    group.members.push(member);
    roleGroups.set(role.name, group);
  }
  const activeStatusOrder: ServerMember["status"][] = ["online", "streaming", "idle", "dnd", "unknown"];
  const renderMember = (member: ServerMember) => {
    const meta = statusMeta[member.status];
    return <button
      key={member.id}
      onClick={() => onSelectMember(member)}
      className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      aria-label={`Abrir perfil de ${member.username}`}
    >
      <span className="relative shrink-0">{member.avatar ? <img src={member.avatar} alt="" className="h-8 w-8 rounded-full border border-white/10 bg-[#242631] object-cover"/> : <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-[#242631] text-[10px] font-semibold text-zinc-200">{member.username.slice(0, 2).toUpperCase()}</span>}<span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#10121a] ${meta.dot}`} title={meta.label}/></span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-zinc-200 group-hover:text-white">{member.username}</span>
      {member.roleNames.some((role) => role.name.toLowerCase().includes("dono")) && <Crown size={11} className="shrink-0 text-amber-300"/>}
      <ChevronRight size={13} className="shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100"/>
    </button>;
  };

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-l border-white/[0.06] bg-[#10121a] px-2.5 py-3">
      <div className="mb-2 flex items-center justify-between px-1.5">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Membros</h2>
          <p className="mt-0.5 text-[10px] text-zinc-500">{members.length} no servidor</p>
        </div>
        <CircleDot size={13} className="text-emerald-400" />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scroll-none">
        {[...roleGroups.entries()].map(([roleName, group]) => <section key={roleName}>
          <h3 className="mb-1 flex items-center gap-1.5 px-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.color }}/>{roleName}<span className="ml-auto font-medium text-zinc-600">{group.members.length}</span></h3>
          {activeStatusOrder.map((status) => group.members.filter((member) => member.status === status)).flat().map(renderMember)}
          {group.members.some((member) => member.status === "offline") && <>
            <h4 className="mt-1 flex items-center gap-1.5 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-600"><span className="h-1.5 w-1.5 rounded-full bg-zinc-500"/>Offline<span className="text-zinc-700">{group.members.filter((member) => member.status === "offline").length}</span></h4>
            {group.members.filter((member) => member.status === "offline").map(renderMember)}
          </>}
        </section>)}
      </div>
      <div className="mt-2 border-t border-white/[0.06] px-1.5 pt-2 text-[9px] text-zinc-500">Clique em um membro para abrir o perfil</div>
    </aside>
  );
}
