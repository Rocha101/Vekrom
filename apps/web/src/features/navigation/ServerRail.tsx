import React from "react";
import { MessageSquare, Plus, Compass, LogOut, Radio, Sparkles } from "lucide-react";
import { Server } from "../../lib/api";

interface ServerRailProps {
  servers: Server[];
  activeServerId: string | null;
  onSelectServer: (id: string | null) => void;
  onCreateServer: () => void;
  onLogout: () => void;
}

export function ServerRail({
  servers,
  activeServerId,
  onSelectServer,
  onCreateServer,
  onLogout,
}: ServerRailProps) {
  return (
    <nav
      className="w-[72px] min-w-[72px] max-w-[72px] h-full bg-[#07080a] border-r border-white/[0.06] flex flex-col items-center py-3 gap-2 flex-shrink-0 select-none z-20"
      aria-label="Servidores"
    >
      {/* Home / DMs Button */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Active Pill Indicator */}
        <span
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300 ${
            activeServerId === null
              ? "h-10 bg-[#2563eb]"
              : "h-2 group-hover:h-5 bg-zinc-500 opacity-0 group-hover:opacity-100"
          }`}
        />

        <button
          onClick={() => onSelectServer(null)}
          title="Mensagens Diretas & Social"
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            activeServerId === null
              ? "bg-[#2563eb] text-white shadow-lg shadow-blue-600/40 rounded-2xl scale-105"
              : "bg-[#14161f] text-zinc-300 hover:bg-[#2563eb] hover:text-white rounded-[24px] hover:rounded-2xl"
          }`}
        >
          <MessageSquare size={22} />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-white/[0.08] my-1 rounded-full" />

      {/* Servers List */}
      <div className="flex-1 w-full overflow-y-auto scroll-none flex flex-col items-center gap-2">
        {servers.map((s) => {
          const isActive = activeServerId === s.id;
          const initials = s.name.slice(0, 2).toUpperCase();

          return (
            <div key={s.id} className="relative group flex items-center justify-center w-full">
              <span
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300 ${
                  isActive
                    ? "h-10 bg-[#2563eb]"
                    : "h-2 group-hover:h-5 bg-zinc-500 opacity-0 group-hover:opacity-100"
                }`}
              />

              <button
                onClick={() => onSelectServer(s.id)}
                title={s.name}
                className={`w-12 h-12 flex items-center justify-center font-bold text-sm tracking-wider transition-all duration-300 overflow-hidden ${
                  isActive
                    ? "bg-[#2563eb] text-white shadow-lg shadow-blue-600/40 rounded-2xl scale-105"
                    : "bg-[#161822] text-zinc-300 hover:bg-[#202432] hover:text-white rounded-[24px] hover:rounded-2xl border border-white/[0.05]"
                }`}
              >
                {s.iconUrl ? (
                  <img
                    src={s.iconUrl}
                    alt={s.name}
                    className="w-full h-full object-cover rounded-inherit"
                  />
                ) : (
                  initials
                )}
              </button>
            </div>
          );
        })}

        {/* Add Server Button */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={onCreateServer}
            title="Criar novo servidor"
            className="w-12 h-12 rounded-[24px] hover:rounded-2xl bg-[#14161f] hover:bg-emerald-600 text-emerald-400 hover:text-white flex items-center justify-center transition-all duration-300 border border-white/[0.05] hover:border-emerald-500/50 shadow-md"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Logout button at bottom */}
      <button
        onClick={onLogout}
        title="Desconectar"
        className="w-10 h-10 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all"
      >
        <LogOut size={18} />
      </button>
    </nav>
  );
}
