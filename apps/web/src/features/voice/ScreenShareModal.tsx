import { useEffect, useRef, useState } from "react";
import { Monitor, AppWindow, Globe, X, Check, MonitorPlay, ArrowLeft, Radio } from "lucide-react";
import { useUI, useServerStore, useVoice } from "../../stores";
import { useVoiceCallCtx } from "./VoiceProvider";

export interface StreamQualitySettings {
  resolution: "720" | "1080";
  frameRate: "30" | "60";
  withAudio: boolean;
  /** "window" = Aplicativos, "monitor" = Telas Inteiras (dica p/ o seletor do navegador) */
  displaySurface: "window" | "monitor";
}

type Tab = "apps" | "screens";

const APP_SOURCES = [
  { id: "janela", tag: "APLICATIVO", name: "Janela de aplicativo", grad: "from-[#1b2a6b] to-[#101320]", Icon: AppWindow },
  { id: "guia", tag: "NAVEGADOR", name: "Guia do navegador", grad: "from-[#0e4d31] to-[#101320]", Icon: Globe },
];

const SCREEN_SOURCES = [
  { id: "tela1", tag: "TELA PRINCIPAL", name: "Tela inteira principal", grad: "from-[#5c1a30] to-[#101320]", Icon: Monitor },
  { id: "tela2", tag: "TELA ESTENDIDA", name: "Monitor secundário", grad: "from-[#2c1c5e] to-[#101320]", Icon: MonitorPlay },
];

export interface ScreenShareModalProps {
  isOpen: boolean;
  channelName: string;
  onClose: () => void;
  /** Captura e devolve a prévia (abre o seletor do navegador). */
  onPreview: (settings: StreamQualitySettings) => Promise<boolean>;
  /** Prévia pronta (ainda não transmite). */
  previewStream: MediaStream | null;
  /** Nome real da superfície capturada (título da janela/guia). */
  previewLabel: string;
  /** Confirma a prévia e entra ao vivo. */
  onConfirmPreview: () => Promise<boolean>;
  /** Descarta a prévia. */
  onCancelPreview: () => void;
}

function PreviewVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="w-full aspect-video object-contain bg-black rounded-xl border border-white/10"
    />
  );
}

export function ScreenShareModal({
  isOpen, channelName, onClose, onPreview, previewStream, previewLabel, onConfirmPreview, onCancelPreview,
}: ScreenShareModalProps) {
  const [tab, setTab] = useState<Tab>("apps");
  const [selected, setSelected] = useState("janela");
  const [hd, setHd] = useState(true);
  const [fps60, setFps60] = useState(false);
  const [withAudio, setWithAudio] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Fecha e limpa ao trocar de canal / desmontar
  useEffect(() => {
    if (!isOpen) setWaiting(false);
  }, [isOpen ]);

  if (!isOpen) return null;
  const showingPreview = previewStream !== null;

  const advance = async () => {
    setWaiting(true);
    try {
      await onPreview({
        resolution: hd ? "720" : "1080",
        frameRate: fps60 ? "60" : "30",
        withAudio,
        displaySurface: tab === "apps" ? "window" : "monitor",
      });
    } finally {
      setWaiting(false);
    }
  };

  const back = () => {
    onCancelPreview();
  };

  const closeAll = () => {
    if (previewStream) onCancelPreview();
    onClose();
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      const ok = await onConfirmPreview();
      if (ok) onClose();
    } finally {
      setConfirming(false);
    }
  };

  const sources = tab === "apps" ? APP_SOURCES : SCREEN_SOURCES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Compartilhar tela"
      onClick={closeAll}
    >
      <div
        className="w-full max-w-[460px] rounded-3xl bg-[#181a24] border border-white/[0.08] p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.85)] my-auto max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex flex-col items-center text-center">
          <button
            onClick={closeAll}
            aria-label="Fechar"
            className="absolute -top-2 right-0 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5865f2] to-[#3b45c3] grid place-items-center shadow-lg shadow-indigo-600/40">
              <Monitor size={30} className="text-white" />
            </div>
            <span className="absolute -bottom-1 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-extrabold text-white border-2 border-[#1e1f22]">
              HD
            </span>
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-white">Compartilhar Tela</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {showingPreview
              ? "Confira a prévia e entre ao vivo quando estiver pronto!"
              : `Selecione o que você quer transmitir em #${channelName} e chame seus amigos para assistir!`}
          </p>
        </div>

        {showingPreview ? (
          <>
            {/* Prévia espelhada antes de entrar ao vivo */}
            <div className="mt-4">
              <PreviewVideo stream={previewStream} />
              <div className="mt-2 flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#2b2d31]">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-semibold text-zinc-200 truncate" title={previewLabel}>
                  {previewLabel || "Tela selecionada"}
                </span>
                <span className="ml-auto text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                  <Radio size={11} /> PRÉVIA
                </span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={back}
                className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white font-semibold px-2 py-2"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <button
                onClick={() => void confirm()}
                disabled={confirming}
                className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-bold transition-all active:scale-95"
              >
                {confirming ? "Entrando..." : "Transmitir agora"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Tabs */}
            <div className="mt-5 flex gap-5 border-b border-white/10 text-sm font-bold">
              <button
                onClick={() => {
                  setTab("apps");
                  setSelected("janela");
                }}
                className={`pb-2 -mb-px ${tab === "apps" ? "text-white border-b-2 border-[#5865f2]" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Aplicativos
              </button>
              <button
                onClick={() => {
                  setTab("screens");
                  setSelected("tela1");
                }}
                className={`pb-2 -mb-px ${tab === "screens" ? "text-white border-b-2 border-[#5865f2]" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Telas Inteiras
              </button>
            </div>

            {/* Source cards */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {sources.map((s) => {
                const active = selected === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                    className={`rounded-xl border-2 overflow-hidden text-left transition-all active:scale-[0.98] ${
                      active ? "border-[#5865f2] shadow-[0_0_16px_rgba(88,101,242,0.35)]" : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className={`relative h-24 bg-gradient-to-br ${s.grad} grid place-items-center`}>
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-extrabold tracking-wide text-white">
                        {s.tag}
                      </span>
                      {active && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#5865f2] grid place-items-center">
                          <Check size={12} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                      <s.Icon size={26} className="text-white/90" />
                    </div>
                    <div className="px-2.5 py-2 text-[11px] font-semibold text-zinc-200 truncate bg-[#2b2d31]">
                      {s.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quality */}
            <div className="mt-4 flex items-center gap-2 text-[11px] font-bold">
              <span className="text-zinc-400 mr-1">QUALIDADE</span>
              <button
                onClick={() => setHd(true)}
                className={`px-2.5 py-1 rounded-full ${hd ? "bg-emerald-600 text-white" : "bg-white/10 text-zinc-400"}`}
              >
                HD 720p
              </button>
              <button
                onClick={() => setHd(false)}
                className={`px-2.5 py-1 rounded-full ${!hd ? "bg-emerald-600 text-white" : "bg-white/10 text-zinc-400"}`}
              >
                Full HD 1080p
              </button>
              <button
                onClick={() => setFps60((v) => !v)}
                className={`px-2.5 py-1 rounded-full ${fps60 ? "bg-emerald-600 text-white" : "bg-white/10 text-zinc-400"}`}
              >
                {fps60 ? "60 FPS" : "30 FPS"}
              </button>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withAudio}
                onChange={(e) => setWithAudio(e.target.checked)}
                className="w-4 h-4 accent-[#5865f2]"
              />
              Compartilhar áudio do sistema
            </label>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between">
              <button onClick={closeAll} className="text-sm text-zinc-300 hover:text-white font-semibold px-2 py-2">
                Cancelar
              </button>
              <button
                onClick={() => void advance()}
                disabled={waiting}
                className="px-8 py-2.5 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-60 text-white text-sm font-bold transition-all active:scale-95"
              >
                {waiting ? "Aguardando..." : "Avançar"}
              </button>
            </div>

            <p className="mt-3 text-[11px] text-zinc-500 text-center">
              Na próxima etapa o navegador pede a confirmação final da tela.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function GlobalShareModal() {
  const open = useUI((s) => s.shareModalOpen);
  const setOpen = useUI((s) => s.setShareModalOpen);
  const call = useVoiceCallCtx();
  const callChannelId = useVoice((s) => s.channelId);
  const channelsMap = useServerStore((s) => s.channelsMap);
  if (!open) return null;
  let channelName = callChannelId ?? "chamada";
  for (const list of Object.values(channelsMap)) {
    const found = list.find((c) => c.id === callChannelId);
    if (found) {
      channelName = found.name;
      break;
    }
  }
  return (
    <ScreenShareModal
      isOpen={open}
      channelName={channelName}
      onClose={() => setOpen(false)}
      onPreview={(s) =>
        call.previewScreen({
          displaySurface: s.displaySurface,
          width: s.resolution === "1080" ? 1920 : 1280,
          frameRate: Number(s.frameRate),
          withAudio: s.withAudio,
        })
      }
      previewStream={call.previewStream}
      previewLabel={call.previewLabel}
      onConfirmPreview={call.confirmPreview}
      onCancelPreview={call.cancelPreview}
    />
  );
}
