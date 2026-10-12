import React from "react";
import { Home, Users, Search } from "lucide-react";
import { MobileTab } from "../../stores";

interface BottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  userAvatar?: string;
}

export function BottomNav({ activeTab, onTabChange, userAvatar }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0e12]/95 backdrop-blur-xl border-t border-white/[0.08] px-4 pt-2 pb-safe flex items-center justify-around"
      aria-label="Navegação Principal"
    >
      {/* Home */}
      <button
        onClick={() => onTabChange("home")}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
          activeTab === "home"
            ? "text-[#2d6cf6] scale-110 drop-shadow-[0_0_10px_rgba(45,108,246,0.5)]"
            : "text-zinc-400 hover:text-white"
        }`}
        aria-label="Início"
      >
        <Home size={24} strokeWidth={activeTab === "home" ? 2.5 : 1.8} />
      </button>

      {/* Social / Friends */}
      <button
        onClick={() => onTabChange("social")}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 relative ${
          activeTab === "social"
            ? "text-[#2d6cf6] scale-110 drop-shadow-[0_0_10px_rgba(45,108,246,0.5)]"
            : "text-zinc-400 hover:text-white"
        }`}
        aria-label="Social e Amigos"
      >
        <Users size={24} strokeWidth={activeTab === "social" ? 2.5 : 1.8} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2d6cf6] ring-2 ring-[#0d0e12]" />
      </button>

      {/* Search / Discover */}
      <button
        onClick={() => onTabChange("search")}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
          activeTab === "search"
            ? "text-[#2d6cf6] scale-110 drop-shadow-[0_0_10px_rgba(45,108,246,0.5)]"
            : "text-zinc-400 hover:text-white"
        }`}
        aria-label="Explorar"
      >
        <Search size={24} strokeWidth={activeTab === "search" ? 2.5 : 1.8} />
      </button>

      {/* Profile */}
      <button
        onClick={() => onTabChange("profile")}
        className={`flex flex-col items-center justify-center p-1 rounded-full transition-all duration-200 ${
          activeTab === "profile"
            ? "ring-2 ring-[#2d6cf6] ring-offset-2 ring-offset-[#0d0e12] scale-105"
            : "opacity-85 hover:opacity-100"
        }`}
        aria-label="Perfil"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 border border-white/10">
          <img
            src={userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </button>
    </nav>
  );
}
