import React from "react";
import { Check } from "lucide-react";

export function VerifiedBadge({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#2563eb] text-white flex-shrink-0 shadow-sm shadow-blue-500/30 ${className}`}
      style={{ width: size, height: size }}
      title="Verified Creator"
    >
      <Check size={size * 0.7} strokeWidth={3.5} />
    </span>
  );
}

export function LiveBadge({ pulse = true, size = "md", className = "" }: { pulse?: boolean; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2 py-0.5 text-xs gap-1.5",
    lg: "px-2.5 py-1 text-xs font-bold gap-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/40 ${sizeClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 ${
          pulse ? "animate-pulse" : ""
        }`}
      />
      Live
    </span>
  );
}

export function StatusIndicator({ status }: { status: "streaming" | "online" | "idle" | "offline" | "dnd" }) {
  if (status === "streaming") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-[#12141a] ring-2 ring-purple-500/40 animate-pulse flex-shrink-0" title="Transmissão ao vivo" />
    );
  }
  if (status === "online") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#12141a] flex-shrink-0" title="Online" />
    );
  }
  if (status === "idle") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-[#12141a] relative overflow-hidden flex-shrink-0" title="Ausente">
        <span className="absolute -top-0.5 -left-0.5 w-full h-full bg-[#12141a] rounded-full scale-75" />
      </span>
    );
  }
  if (status === "dnd") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#12141a] grid place-items-center flex-shrink-0" title="Não perturbe">
        <span className="w-1.5 h-[1.5px] bg-white rounded-full" />
      </span>
    );
  }
  return (
    <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-400 bg-[#12141a] grid place-items-center flex-shrink-0" title="Offline">
      <span className="w-1 h-1 rounded-full bg-zinc-400" />
    </span>
  );
}
