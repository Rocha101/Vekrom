import React, { useState } from "react";
import { X, Hash, Volume2 } from "lucide-react";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverName: string;
  onCreateChannel: (name: string, type: "text" | "voice") => Promise<void>;
}

export function CreateChannelModal({
  isOpen,
  onClose,
  serverName,
  onCreateChannel,
}: CreateChannelModalProps) {
  const [channelType, setChannelType] = useState<"text" | "voice">("text");
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    // Format name to lower case and slug style for text channels
    const formatted = channelType === "text"
      ? channelName.trim().toLowerCase().replace(/\s+/g, "-")
      : channelName.trim();

    setLoading(true);
    try {
      await onCreateChannel(formatted, channelType);
      onClose();
      setChannelName("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-[440px] bg-[#181a24] border border-white/[0.08] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col transition-all animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all z-20"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col">
          <div className="pt-1 pb-4">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Criar canal</h2>
            <p className="text-xs text-zinc-400 mt-1">em {serverName}</p>
          </div>

          {/* Channel Type Selector */}
          <div className="space-y-2 mb-4">
            <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              TIPO DE CANAL
            </span>

            {/* Text option */}
            <button
              type="button"
              onClick={() => setChannelType("text")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                channelType === "text"
                  ? "bg-[#202433] border-[#2563eb] text-white shadow-md shadow-blue-600/10"
                  : "bg-[#1c1f2b] border-white/[0.05] text-zinc-400 hover:text-white hover:bg-[#202330]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Hash size={20} className={channelType === "text" ? "text-[#2563eb]" : "text-zinc-500"} />
                <div className="text-left">
                  <span className="text-sm font-bold block text-white">Texto</span>
                  <span className="text-xs text-zinc-400">Poste mensagens, imagens e memes</span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${channelType === "text" ? "border-[#2563eb]" : "border-zinc-600"}`}>
                {channelType === "text" && <div className="w-2 h-2 rounded-full bg-[#2563eb]" />}
              </div>
            </button>

            {/* Voice option */}
            <button
              type="button"
              onClick={() => setChannelType("voice")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                channelType === "voice"
                  ? "bg-[#202433] border-[#2563eb] text-white shadow-md shadow-blue-600/10"
                  : "bg-[#1c1f2b] border-white/[0.05] text-zinc-400 hover:text-white hover:bg-[#202330]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Volume2 size={20} className={channelType === "voice" ? "text-emerald-400" : "text-zinc-500"} />
                <div className="text-left">
                  <span className="text-sm font-bold block text-white">Voz</span>
                  <span className="text-xs text-zinc-400">Converse por voz e compartilhe tela</span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${channelType === "voice" ? "border-[#2563eb]" : "border-zinc-600"}`}>
                {channelType === "voice" && <div className="w-2 h-2 rounded-full bg-[#2563eb]" />}
              </div>
            </button>
          </div>

          {/* Channel Name Input */}
          <div className="space-y-1.5 mb-6">
            <label className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              NOME DO CANAL
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                {channelType === "text" ? <Hash size={16} /> : <Volume2 size={16} />}
              </span>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={channelType === "text" ? "novo-canal" : "Sala de Voz"}
                autoFocus
                required
                className="w-full bg-[#111219] border border-white/[0.08] focus:border-[#2563eb] rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !channelName.trim()}
              className="py-2.5 px-6 rounded-xl font-bold text-xs bg-[#2563eb] hover:bg-blue-600 disabled:opacity-50 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              {loading ? "Criando..." : "Criar Canal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
