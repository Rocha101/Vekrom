import React, { useState, useRef } from "react";
import {
  X,
  ChevronRight,
  Gamepad2,
  Heart,
  GraduationCap,
  BookOpen,
  Sparkles,
  Camera,
  ArrowLeft,
  Upload,
  Check,
  RotateCcw,
} from "lucide-react";

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateServer: (name: string, template?: string, iconUrl?: string) => Promise<void>;
  onJoinServer?: (code: string) => Promise<void>;
  username?: string;
}

type ModalStep = "templates" | "customize" | "join";

export function CreateServerModal({
  isOpen,
  onClose,
  onCreateServer,
  onJoinServer,
  username = "Usuário",
}: CreateServerModalProps) {
  const [step, setStep] = useState<ModalStep>("templates");
  const [serverName, setServerName] = useState(`Servidor de ${username}`);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (templateName: string, defaultTitle: string) => {
    setSelectedTemplate(templateName);
    setServerName(`${defaultTitle} de ${username}`);
    setStep("customize");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem selecionada deve ter menos de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setServerIcon(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    setLoading(true);
    try {
      await onCreateServer(serverName.trim(), selectedTemplate, serverIcon || undefined);
      onClose();
      // Reset
      setStep("templates");
      setServerName(`Servidor de ${username}`);
      setServerIcon(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !onJoinServer) return;
    setLoading(true);
    try {
      await onJoinServer(inviteCode.trim());
      onClose();
      setStep("templates");
      setInviteCode("");
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
      <div className="relative w-full max-w-[460px] bg-[#181a24] border border-white/[0.08] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col transition-all animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all z-20"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* STEP 1: Template Selection (Image 2) */}
        {step === "templates" && (
          <div className="p-6 flex flex-col max-h-[85vh] overflow-y-auto scroll-none">
            {/* Header */}
            <div className="text-center pt-2 pb-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Criar seu servidor
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Seu servidor é onde você e seus amigos se reúnem. Crie o seu e comece a interagir.
              </p>
            </div>

            {/* Option 1: "Criar o meu" */}
            <div className="mt-2 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate("custom");
                  setServerName(`Servidor de ${username}`);
                  setStep("customize");
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#202330] hover:bg-[#272b3b] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group active:scale-[0.99] text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                    <Sparkles size={20} />
                  </div>
                  <span className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                    Criar o meu
                  </span>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </button>

              {/* Section Header */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider px-1">
                  COMEÇAR DE UM MOLDE
                </span>
              </div>

              {/* Template Items */}
              <div className="space-y-2">
                {/* Jogos */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate("jogos", "Clube de Jogos")}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#202330] hover:bg-[#272b3b] border border-white/[0.06] hover:border-white/[0.12] transition-all group active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                      <Gamepad2 size={20} />
                    </div>
                    <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                      Jogos
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                {/* Amigos */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate("amigos", "Galera dos Amigos")}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#202330] hover:bg-[#272b3b] border border-white/[0.06] hover:border-white/[0.12] transition-all group active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                      <Heart size={20} />
                    </div>
                    <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                      Amigos
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                {/* Grupo de estudos */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate("estudos", "Grupo de Estudos")}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#202330] hover:bg-[#272b3b] border border-white/[0.06] hover:border-white/[0.12] transition-all group active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                      <GraduationCap size={20} />
                    </div>
                    <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                      Grupo de estudos
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                {/* Clube escolar */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate("clube", "Clube Escolar")}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#202330] hover:bg-[#272b3b] border border-white/[0.06] hover:border-white/[0.12] transition-all group active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                      <BookOpen size={20} />
                    </div>
                    <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                      Clube escolar
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            {/* Footer Section: "Já tem um convite?" */}
            <div className="mt-6 pt-5 border-t border-white/[0.08] text-center">
              <h3 className="text-sm font-bold text-white mb-2">Já tem um convite?</h3>
              <button
                type="button"
                onClick={() => setStep("join")}
                className="w-full py-3 px-4 rounded-2xl bg-[#222533] hover:bg-[#2b2f42] text-white font-bold text-xs border border-white/[0.08] transition-all active:scale-[0.99]"
              >
                Entrar em um servidor
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Customize Server Name & Icon Photo (Pointed by the arrow) */}
        {step === "customize" && (
          <form onSubmit={handleSubmitCreate} className="p-6 flex flex-col">
            <div className="text-center pt-2 pb-3">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Personalize seu servidor
              </h2>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Dê uma identidade ao seu novo espaço. Você sempre poderá alterar o nome e ícone depois.
              </p>
            </div>

            {/* Hidden Native File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Server Avatar / Cover Photo Upload Area */}
            <div className="flex flex-col items-center justify-center my-3">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Clique para adicionar foto de capa ou ícone"
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden focus:outline-none ${
                    serverIcon
                      ? "ring-4 ring-[#2563eb] shadow-xl shadow-blue-600/30"
                      : "border-2 border-dashed border-white/25 hover:border-[#2563eb] bg-[#12141c] hover:bg-[#1a1d28] text-zinc-400 hover:text-white"
                  }`}
                >
                  {serverIcon ? (
                    <>
                      <img
                        src={serverIcon}
                        alt="Pré-visualização do Servidor"
                        className="w-full h-full object-cover rounded-full"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1">
                        <Upload size={18} />
                        <span>Trocar foto</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera size={26} className="text-zinc-400 group-hover:text-white transition-colors" />
                      <span className="text-[10px] font-extrabold mt-1 tracking-wider uppercase text-zinc-400 group-hover:text-white transition-colors">
                        ÍCONE
                      </span>
                    </>
                  )}
                </button>

                {/* Badge Bottom Right */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform group-hover:scale-110 ${
                    serverIcon ? "bg-emerald-600 hover:bg-emerald-500" : "bg-[#2563eb] hover:bg-blue-600"
                  }`}
                  title={serverIcon ? "Alterar foto" : "Adicionar foto"}
                >
                  {serverIcon ? <Check size={14} strokeWidth={3} /> : "+"}
                </button>

                {/* Remove Photo Button if selected */}
                {serverIcon && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setServerIcon(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                    title="Remover foto"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
              </div>

              <span className="text-[11px] text-zinc-400 mt-2 font-medium">
                {serverIcon ? "Foto de capa selecionada!" : "Toque acima para escolher uma foto do seu computador"}
              </span>

            </div>

            {/* Server Name Input */}
            <div className="space-y-1.5 my-3">
              <label className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                NOME DO SERVIDOR
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="Ex: Squad do VALORANT"
                autoFocus
                required
                className="w-full bg-[#111219] border border-white/[0.08] focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
              />
              <p className="text-[11px] text-zinc-500 leading-tight">
                Ao criar um servidor, você vekroma com as Diretrizes da Comunidade do Vekrom.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("templates")}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white px-3 py-2 rounded-xl transition-colors"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <button
                type="submit"
                disabled={loading || !serverName.trim()}
                className="py-2.5 px-6 rounded-xl font-bold text-xs bg-[#2563eb] hover:bg-blue-600 disabled:opacity-50 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                {loading ? "Criando..." : "Criar Servidor"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Join via Invite */}
        {step === "join" && (
          <form onSubmit={handleSubmitJoin} className="p-6 flex flex-col">
            <div className="text-center pt-2 pb-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Entrar em um servidor
              </h2>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Digite um link de convite ou código para entrar em uma comunidade existente.
              </p>
            </div>

            <div className="space-y-1.5 my-3">
              <label className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                CÓDIGO OU LINK DO CONVITE
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="https://vekrom.gg/squad-elite"
                autoFocus
                required
                className="w-full bg-[#111219] border border-white/[0.08] focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
              />
              <span className="text-[11px] text-zinc-500 block">
                Exemplos: vekrom.gg/valorant, squad-xyz123
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("templates")}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white px-3 py-2 rounded-xl transition-colors"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                className="py-2.5 px-6 rounded-xl font-bold text-xs bg-[#2563eb] hover:bg-blue-600 disabled:opacity-50 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                {loading ? "Entrando..." : "Entrar no Servidor"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
