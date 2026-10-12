import { useRef, useState } from "react";
import {
  X,
  Pencil,
  Check,
  Camera,
  Trash2,
  Sparkles,
  MessageSquare,
  Gift,
  MoreHorizontal,
  ShieldCheck,
  Award,
  Zap,
  Globe,
  Smile,
  Palette,
} from "lucide-react";
import { api } from "../../lib/api";
import { gateway } from "../../lib/ws";
import { useAuth, usePresence, type PresenceStatus } from "../../stores";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_ORDER: PresenceStatus[] = ["online", "idle", "dnd", "offline"];

const STATUS_CONFIG: Record<
  PresenceStatus,
  { label: string; desc: string; dotClass: string }
> = {
  online: {
    label: "Disponível",
    desc: "Aparecer como online",
    dotClass: "bg-emerald-500",
  },
  idle: {
    label: "Ausente",
    desc: "Ausente no momento",
    dotClass: "bg-amber-400",
  },
  dnd: {
    label: "Não perturbe",
    desc: "Não receberá notificações",
    dotClass: "bg-rose-500",
  },
  offline: {
    label: "Invisível",
    desc: "Aparecer como offline",
    dotClass: "bg-zinc-500",
  },
};

const BANNER_GRADIENTS = [
  { id: "discord", label: "Noite Profunda", value: "from-[#0e1015] via-[#1a1c23] to-[#121318]" },
  { id: "purple", label: "Nebulosa", value: "from-[#3b156b] via-[#5b21b6] to-[#1e1035]" },
  { id: "blue", label: "Vekrom Blue", value: "from-[#1e3a8a] via-[#2563eb] to-[#0f172a]" },
  { id: "emerald", label: "Esmeralda", value: "from-[#064e3b] via-[#059669] to-[#022c22]" },
  { id: "crimson", label: "Rubi Carmesim", value: "from-[#881337] via-[#e11d48] to-[#4c0519]" },
  { id: "sunset", label: "Pôr do Sol", value: "from-[#7c2d12] via-[#ea580c] to-[#431407]" },
];

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Renderiza o ícone de status autêntico do Discord (inclusive o traço do DND).
 */
function StatusIcon({ status, size = "md" }: { status: PresenceStatus; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-3 h-3 border-[2px]",
    md: "w-4 h-4 border-[2.5px]",
    lg: "w-6 h-6 border-[3.5px]",
  }[size];

  if (status === "dnd") {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-rose-500 border-[#111214] grid place-items-center flex-shrink-0 shadow-sm`}
        title="Não perturbe"
      >
        <div className={size === "lg" ? "w-2.5 h-[3px] bg-white rounded-full" : "w-1.5 h-[2px] bg-white rounded-full"} />
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-amber-400 border-[#111214] relative overflow-hidden flex-shrink-0 shadow-sm`}
        title="Ausente"
      >
        <div className="absolute -top-1 -left-1 w-full h-full bg-[#111214] rounded-full scale-75" />
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-[#111214] border-zinc-400 flex items-center justify-center flex-shrink-0 shadow-sm`}
        title="Invisível"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
      </div>
    );
  }

  // online
  return (
    <div
      className={`${sizeClasses} rounded-full bg-emerald-500 border-[#111214] flex-shrink-0 shadow-sm`}
      title="Disponível"
    />
  );
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const username = useAuth((s) => s.username) ?? "";
  const avatarUrl = useAuth((s) => s.avatarUrl);
  const bio = useAuth((s) => s.bio) || "";
  const pronouns = useAuth((s) => s.pronouns) || "";
  const bannerColor = useAuth((s) => s.bannerColor) || BANNER_GRADIENTS[0].value;
  const updateProfile = useAuth((s) => s.updateProfile);

  const status = usePresence((s) => s.status);
  const customText = usePresence((s) => s.customText);
  const setStatus = usePresence((s) => s.setStatus);
  const setCustomText = usePresence((s) => s.setCustomText);

  const [name, setName] = useState(username);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftPronouns, setDraftPronouns] = useState(pronouns);
  const [draftBannerColor, setDraftBannerColor] = useState(bannerColor);

  const [draftAvatar, setDraftAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [draftStatus, setDraftStatus] = useState<PresenceStatus>(status);
  const [draftCustom, setDraftCustom] = useState(customText);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<"hud" | "edit">("hud");

  const fileRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const shownAvatar = removeAvatar ? null : (draftAvatar ?? avatarUrl);
  const shownName = name.trim() || username || "Usuário";
  const userHandle = shownName.toLowerCase().replace(/\s+/g, "");

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setNote("Por favor, selecione um arquivo de imagem válido (PNG, JPG, GIF ou WEBP).");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setNote("Imagem muito grande (máximo permitido: 8 MB).");
      return;
    }
    setAvatarFile(f);
    setRemoveAvatar(false);
    setDraftAvatar(URL.createObjectURL(f));
    setNote("Foto selecionada! Clique em 'Salvar alterações' para aplicar.");
  };

  const save = async () => {
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 32) {
      setNote("O nome deve ter entre 2 e 32 caracteres.");
      return;
    }
    setSaving(true);
    setNote("");
    let online = true;
    try {
      let finalAvatar: string | null | undefined;
      if (removeAvatar) {
        finalAvatar = null;
        try {
          await api.updateMe({ avatarUrl: null });
        } catch {
          online = false;
        }
      } else if (avatarFile) {
        try {
          const up = await api.uploadAvatar(avatarFile);
          finalAvatar = up.url;
          await api.updateMe({ avatarUrl: up.url });
        } catch {
          online = false;
          finalAvatar = await readAsDataURL(avatarFile);
        }
      }

      if (cleanName !== username) {
        try {
          await api.updateMe({ username: cleanName });
        } catch {
          online = false;
        }
      }

      updateProfile({
        username: cleanName,
        ...(finalAvatar !== undefined ? { avatarUrl: finalAvatar } : {}),
        bio: draftBio.trim(),
        pronouns: draftPronouns.trim(),
        bannerColor: draftBannerColor,
      });

      setStatus(draftStatus);
      setCustomText(draftCustom.trim());

      try {
        gateway.send("PRESENCE_UPDATE", { status: draftStatus });
      } catch {
        /* gateway offline */
      }

      setAvatarFile(null);
      setDraftAvatar(null);
      setRemoveAvatar(false);
      setNote(online ? "Alterações salvas com sucesso!" : "Perfil salvo localmente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Configurações do usuário"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[490px] sm:max-w-[530px] bg-[#111214] border border-white/10 rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input invisível acionado ao clicar no avatar */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#0c0d0f] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#5865f2] animate-pulse" />
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
              Perfil do Usuário
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#1e1f22] p-0.5 rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setActiveTab("hud")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "hud"
                    ? "bg-[#5865f2] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Cartão HUD
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "edit"
                    ? "bg-[#5865f2] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Editar Dados
              </button>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
          {/* ======================================================== */}
          {/* NOVA HUD: ESTILO AUTÊNTICO DA SEGUNDA IMAGEM DE REFERÊNCIA */}
          {/* ======================================================== */}
          <div className="relative rounded-2xl overflow-hidden bg-[#18191c] border border-white/[0.08] shadow-2xl">
            {/* Banner superior com gradiente */}
            <div
              className={`h-24 sm:h-28 w-full bg-gradient-to-r ${draftBannerColor} relative transition-all duration-300`}
            >
              {/* Botão sutil para trocar tema do banner */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-zinc-200 border border-white/10 opacity-70 hover:opacity-100 transition-opacity">
                <Palette size={12} />
                <span className="font-semibold hidden sm:inline">Tema do Banner</span>
              </div>
            </div>

            {/* Corpo do Cartão Discord */}
            <div className="px-4 sm:px-5 pb-5 pt-0 relative bg-[#18191c]">
              {/* Área do Avatar com sobreposição e Pill de status à direita */}
              <div className="flex items-end justify-between -mt-12 sm:-mt-14 mb-3">
                {/* Avatar Interativo (Clica direto para selecionar foto no PC!) */}
                <div className="relative group/avatar">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    title="Clique para escolher foto do seu computador"
                    className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[6px] border-[#18191c] bg-[#111214] overflow-hidden flex items-center justify-center font-black text-xl text-white shadow-2xl transition-transform active:scale-95 group-hover/avatar:ring-2 group-hover/avatar:ring-[#5865f2] focus:outline-none"
                  >
                    {shownAvatar ? (
                      <img
                        src={shownAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover transition-transform group-hover/avatar:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
                        {shownName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Overlay elegante no hover para indicar que é clicável */}
                    <div className="absolute inset-0 bg-black/65 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-[1px]">
                      <Camera size={20} className="text-white drop-shadow-md animate-bounce" />
                      <span className="text-[9px] font-black uppercase tracking-wider mt-1 drop-shadow">
                        Mudar foto
                      </span>
                    </div>
                  </button>

                  {/* Status Indicator autêntico no canto inferior direito do avatar */}
                  <div className="absolute bottom-1 right-1 z-20">
                    <StatusIcon status={draftStatus} size="lg" />
                  </div>
                </div>

                {/* Pill de Status Personalizado (estilo "+ NPC favorito?" da referência) */}
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("edit");
                      setTimeout(() => customInputRef.current?.focus(), 150);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#232428] hover:bg-[#2b2d31] border border-white/[0.08] text-xs font-semibold text-zinc-200 transition-all active:scale-95 shadow-sm max-w-[200px] truncate"
                    title="Editar status personalizado"
                  >
                    <span className="text-zinc-400 text-sm leading-none">+</span>
                    <span className="truncate">
                      {draftCustom.trim() || "Definir status..."}
                    </span>
                  </button>
                </div>
              </div>

              {/* Informações do Usuário (Nome, Handle, Pronomes) */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                    {shownName}
                  </h3>
                </div>

                <div className="flex items-center flex-wrap gap-1.5 text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">@{userHandle}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="italic text-zinc-400">
                    {draftPronouns.trim() || "Adicionar pronomes"}
                  </span>
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-zinc-400 font-medium border border-white/[0.05]">
                    <span>Tag do servidor</span>
                    <span className="text-[8px]">▼</span>
                  </div>
                </div>

                {/* Linha de Badges (estilo Discord com símbolos reais) */}
                <div className="flex items-center gap-1.5 pt-2 pb-1">
                  <div
                    className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-black"
                    title="Verificado Vekrom"
                  >
                    #
                  </div>
                  <div
                    className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center"
                    title="Membro Ativo"
                  >
                    <Sparkles size={11} />
                  </div>
                  <div
                    className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center"
                    title="Impulsionador de Servidor"
                  >
                    <Award size={11} />
                  </div>
                  <div
                    className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center"
                    title="Membro VIP"
                  >
                    <Zap size={11} />
                  </div>
                </div>
              </div>

              {/* Ações Rápidas (Botões Mensagem, Presentear, Opções da Imagem 2) */}
              <div className="flex items-center gap-2 pt-3 pb-2">
                <button
                  type="button"
                  className="flex-1 py-2 px-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-98"
                >
                  <MessageSquare size={14} />
                  <span>Mensagem</span>
                </button>
                <button
                  type="button"
                  className="p-2 rounded-xl bg-[#232428] hover:bg-[#2b2d31] text-zinc-300 hover:text-white border border-white/[0.05] transition-all"
                  title="Presentear Nitro"
                >
                  <Gift size={15} />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-xl bg-[#232428] hover:bg-[#2b2d31] text-zinc-300 hover:text-white border border-white/[0.05] transition-all"
                  title="Mais Opções"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>

              {/* Divisor */}
              <div className="h-[1px] bg-white/[0.08] my-3.5" />

              {/* Seções de Detalhes da Imagem 2 */}
              <div className="space-y-3.5 text-xs">
                {/* Seção: BIO */}
                <div>
                  <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase block mb-1">
                    Bio
                  </span>
                  <p className="text-zinc-200 italic leading-relaxed whitespace-pre-wrap">
                    {draftBio.trim() || "Descreva-se em um haiku"}
                  </p>
                </div>

                {/* Seção: Membro desde */}
                <div>
                  <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase block mb-1">
                    Membro desde
                  </span>
                  <p className="text-zinc-200 font-semibold">16 de jan. de 2023</p>
                </div>

                {/* Seção: Conexões */}
                <div>
                  <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase block mb-1">
                    Conexões
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors py-0.5"
                  >
                    <span className="text-sm font-bold leading-none">+</span>
                    <span>Adicionar conexão</span>
                  </button>
                </div>

                {/* Seção: Nota */}
                <div>
                  <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase block mb-1">
                    Nota (visível apenas para você)
                  </span>
                  <p className="text-zinc-500 italic">Clique para adicionar uma nota</p>
                </div>
              </div>

              {/* Botão de remoção de avatar se houver foto */}
              {shownAvatar && (
                <div className="pt-3 border-t border-white/[0.06] mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setDraftAvatar(null);
                      setRemoveAvatar(true);
                      setNote("Foto removida. Clique em 'Salvar alterações' para confirmar.");
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-300 font-semibold hover:underline"
                  >
                    <Trash2 size={13} />
                    <span>Remover foto de perfil</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PAINEL DE EDIÇÃO DOS CAMPOS */}
          {/* ======================================================== */}
          <div className="space-y-5 bg-[#18191c] p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
            {/* Nome de Usuário e Pronomes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-extrabold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  Nome de Exibição
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={32}
                  placeholder="Seu nome"
                  className="w-full bg-[#111214] border border-white/10 focus:border-[#5865f2] rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold tracking-wider text-zinc-400 uppercase block mb-1.5">
                  Pronomes
                </label>
                <input
                  type="text"
                  value={draftPronouns}
                  onChange={(e) => setDraftPronouns(e.target.value)}
                  maxLength={24}
                  placeholder="Ex: ele/dele, ela/dela"
                  className="w-full bg-[#111214] border border-white/10 focus:border-[#5865f2] rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all"
                />
              </div>
            </div>

            {/* Bio / Sobre Mim */}
            <div>
              <label className="text-[11px] font-extrabold tracking-wider text-zinc-400 uppercase block mb-1.5">
                Sobre Mim (Bio)
              </label>
              <textarea
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                maxLength={190}
                rows={2}
                placeholder="Descreva-se em um haiku ou deixe uma mensagem..."
                className="w-full bg-[#111214] border border-white/10 focus:border-[#5865f2] rounded-xl p-3 text-sm text-white outline-none transition-all resize-none"
              />
            </div>

            {/* Status do Perfil com ícones fiéis */}
            <div>
              <label className="text-[11px] font-extrabold tracking-wider text-zinc-400 uppercase block mb-1.5">
                Status do Perfil
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ORDER.map((st) => {
                  const isSelected = draftStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDraftStatus(st)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-[#5865f2] bg-[#5865f2]/15 text-white shadow-sm"
                          : "border-white/10 text-zinc-300 hover:border-white/20 bg-[#111214]/60"
                      }`}
                    >
                      <StatusIcon status={st} size="md" />
                      <div className="text-left flex-1 min-w-0">
                        <span className="block truncate">{STATUS_CONFIG[st].label}</span>
                      </div>
                      {isSelected && <Check size={14} className="text-[#5865f2]" />}
                    </button>
                  );
                })}
              </div>

              {/* Mensagem Personalizada de Status */}
              <div className="mt-2.5 relative">
                <input
                  ref={customInputRef}
                  type="text"
                  value={draftCustom}
                  onChange={(e) => setDraftCustom(e.target.value)}
                  maxLength={128}
                  placeholder="O que você está fazendo? (mensagem personalizada)"
                  className="w-full bg-[#111214] border border-white/10 focus:border-[#5865f2] rounded-xl px-3 py-2.5 pr-8 text-sm text-white placeholder-zinc-500 outline-none transition-all"
                />
                <Smile
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Tema do Banner */}
            <div>
              <label className="text-[11px] font-extrabold tracking-wider text-zinc-400 uppercase block mb-1.5">
                Gradiente do Banner
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BANNER_GRADIENTS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setDraftBannerColor(bg.value)}
                    title={bg.label}
                    className={`h-8 rounded-xl bg-gradient-to-r ${bg.value} border-2 transition-transform active:scale-95 ${
                      draftBannerColor === bg.value
                        ? "border-white scale-105 shadow-md shadow-white/20"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Feedback message */}
          {note && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check size={14} className="flex-shrink-0" />
              <span>{note}</span>
            </div>
          )}
        </div>

        {/* Modal Footer (Sticky) */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-white/[0.06] bg-[#0c0d0f] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Pencil size={14} />
            <span>{saving ? "Salvando..." : "Salvar alterações"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
