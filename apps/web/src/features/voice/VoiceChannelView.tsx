import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Headphones, PhoneOff, Volume2,
  Video, VideoOff, MonitorUp, Radio,
} from "lucide-react";
import { gateway } from "../../lib/ws";
import { type RemotePeer } from "../../voice-call";
import { useAuth, useVoice, useUI } from "../../stores";
import { useVoiceCallCtx } from "./VoiceProvider";

interface VoiceStore {
  channelId: string | null;
  muted: boolean;
  deafened: boolean;
  video: boolean;
  sharing: boolean;
  speaking: Set<string>;
  join: (id: string) => void;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setVideo: (v: boolean) => void;
  setSharing: (v: boolean) => void;
}

interface VoiceChannelViewProps {
  channelId: string;
  channelName: string;
  userLimit?: number;
  canConnect?: boolean;
  voice: VoiceStore;
  username?: string;
}

/** <video> ligado a uma MediaStream. */
function StreamVideo({
  stream, mirrored, muted, className,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  if (!stream) return null;
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}

function AvatarBadge({ name, highlight, avatarUrl }: { name: string; highlight?: boolean; avatarUrl?: string | null }) {
  return (
    <div className="relative">
      <div
        className={`w-16 h-16 rounded-full border-2 p-0.5 flex items-center justify-center font-bold text-lg text-white ${
          highlight
            ? "bg-[#2563eb] border-[#2563eb] shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            : "bg-[#1e2330] border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        }`}
      >
        {name.slice(0, 2).toUpperCase()}
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={`Foto de ${name}`}
            className="absolute inset-0 h-full w-full rounded-full object-cover"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        )}
      </div>
      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#141620]" />
    </div>
  );
}

/**
 * Botão de mídia no estilo da referência: retângulo escuro arredondado,
 * ícone central e selo de "desligado" no canto inferior direito.
 */
function MediaButton({
  onClick, title, off, active, disabled, children,
}: {
  onClick: () => void;
  title: string;
  off?: boolean;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`relative w-16 h-11 rounded-xl grid place-items-center text-white transition-all active:scale-95 ${
        disabled ? "cursor-not-allowed opacity-50" : active ? "bg-emerald-600 hover:bg-emerald-500" : "bg-[#2b2d31] hover:bg-[#35373c]"
      }`}
    >
      {children}
      {off && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#f23f43] grid place-items-center border-2 border-[#141620]">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="1" y1="9" x2="9" y2="1" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

function PeerTile({ peer, deafened }: { peer: RemotePeer; deafened: boolean }) {
  const hasVideo = peer.screen ?? (peer.camera ? peer.cam : null);
  const label = peer.sharing ? "Tela de " : "";
  return (
    <div
      className={`bg-[#141620] border rounded-2xl overflow-hidden relative group transition-all ${
        peer.sharing ? "sm:col-span-2 lg:col-span-2 aspect-video" : "aspect-video"
      } ${peer.speaking ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "border-white/[0.06] hover:border-[#2563eb]/50"}`}
    >
      {hasVideo ? (
        <StreamVideo stream={hasVideo} muted={deafened} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          <AvatarBadge name={peer.userId} />
          <span className="font-bold text-sm text-white mt-3">{peer.userId}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 text-[11px] font-semibold text-white">
        {peer.muted && <MicOff size={12} className="text-rose-400" />}
        {label}
        {peer.userId}
      </div>
      {peer.speaking && (
        <span className="absolute top-2 left-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <Radio size={12} /> Falando...
        </span>
      )}
    </div>
  );
}

export function VoiceChannelView({ channelId, channelName, userLimit = 0, canConnect = true, voice, username }: VoiceChannelViewProps) {
  const call = useVoiceCallCtx();
  const avatarUrl = useAuth((state) => state.avatarUrl);
  const [capacityError, setCapacityError] = useState("");
  const isConnected = voice.channelId === channelId;
  const me = username ?? "Você";
  const microphoneMuted = voice.muted || call.serverMuted;
  const audioDeafened = voice.deafened || call.serverDeafened;
  const remoteList = Object.values(call.remotes);
  const participantCount = remoteList.length + (isConnected ? 1 : 0);
  const isFull = userLimit > 0 && participantCount >= userLimit;

  /** Entra (ou troca) para este canal. A chamada persiste ao navegar p/ canais de texto. */
  const switchHere = useCallback(() => {
    if (!canConnect) {
      setCapacityError("Este cargo não tem permissão para entrar em chamadas.");
      return;
    }
    const currentVoiceChannel = useVoice.getState().channelId;
    const currentParticipants = remoteList.length + (currentVoiceChannel === channelId ? 1 : 0);
    if (userLimit > 0 && currentParticipants >= userLimit && currentVoiceChannel !== channelId) {
      setCapacityError(`Esta chamada atingiu o limite de ${userLimit} ${userLimit === 1 ? "membro" : "membros"}.`);
      return;
    }
    setCapacityError("");
    const prev = useVoice.getState().channelId;
    // Keep the AudioContext primed by the channel click so autoplay policy
    // does not suspend the speech-level analyser during the following effect.
    call.stop(true);
    if (prev && prev !== channelId) {
      try {
        gateway.send("VOICE_STATE_UPDATE", { channelId: null });
      } catch { /* noop */ }
    }
    useVoice.getState().join(channelId);
    try {
      gateway.send("VOICE_STATE_UPDATE", { channelId });
    } catch { /* gateway offline: segue em modo local */ }
    void call.start();
  }, [channelId, call, remoteList.length, userLimit, canConnect]);

  // Entrada automática: clicar no canal = entrar na chamada (sem botão/modal).
  // Sem cleanup de saída: trocar p/ canal de texto mantém a chamada viva.
  useEffect(() => {
    if (!canConnect) return;
    if (voice.channelId === channelId && call.started) return; // já conectado aqui
    switchHere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, canConnect]);

  const disconnect = () => {
    call.stop();
    voice.leave();
    gateway.send("VOICE_STATE_UPDATE", { channelId: null });
  };

  const toggleMic = () => {
    if (call.serverMuted) return;
    const m = !voice.muted;
    call.setMicrophone(m);
    voice.toggleMute();
    gateway.send("VOICE_STATE_UPDATE", { channelId, mute: m });
  };

  const toggleCamera = () => {
    void call.toggleCamera();
  };

  const toggleDeafen = () => {
    if (call.serverDeafened) return;
    const d = !voice.deafened;
    voice.toggleDeafen();
    gateway.send("VOICE_STATE_UPDATE", { channelId, deaf: d });
  };

  const handleScreenClick = () => {
    if (voice.sharing) {
      void call.toggleScreen();
    } else {
      useUI.getState().setShareModalOpen(true);
    }
  };

  // (removido: entrada agora é automática ao clicar no canal)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="text-emerald-400 animate-pulse" size={24} />
            <h2 className="text-xl font-extrabold text-white">{channelName}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isConnected ? `${participantCount} ${participantCount === 1 ? "membro" : "membros"} na chamada` : "Canal de voz com baixa latência e áudio espacial"}
            {userLimit > 0 ? ` • limite de ${userLimit}` : " • sem limite de membros"}
          </p>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-300">
              {participantCount}{userLimit > 0 ? `/${userLimit}` : ""} na chamada
            </span>
          </div>
        ) : (
          <button
            onClick={switchHere}
            disabled={isFull}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 text-white text-xs font-bold transition-all active:scale-95"
          >
            {isFull ? "Chamada cheia" : "Entrar na chamada"}
          </button>
        )}
      </div>

      {capacityError && <div role="status" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{capacityError}</div>}
      {!canConnect && <div role="status" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-200">Seu cargo não tem permissão para entrar em chamadas neste servidor. Peça ao dono para atualizar as permissões do seu cargo.</div>}

      {call.error && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
          {call.error} (voz por texto continua funcionando)
        </div>
      )}

      {/* Stage: vídeos */}
      <div className="flex-1 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        {isConnected && (
          <>
            {/* Minha câmera */}
            <div
              title={microphoneMuted ? "Microfone mutado" : call.selfSpeaking ? "Você está falando" : "Microfone ativo"}
              className={`bg-[#141620] border rounded-2xl overflow-hidden relative transition-colors duration-100 ${
                microphoneMuted
                  ? "border-white/[0.06]"
                  : call.selfSpeaking
                    ? "border-emerald-400"
                    : "border-white/[0.08]"
              } aspect-video`}
            >
              {voice.video && call.localCam ? (
                <StreamVideo stream={call.localCam} mirrored muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <AvatarBadge name={me} highlight avatarUrl={avatarUrl} />
                  <span className="font-bold text-sm text-white mt-3">Você</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 text-[11px] font-semibold text-white">
                {voice.muted && <MicOff size={12} className="text-rose-400" />}
                Você
              </div>
            </div>

            {/* Minha tela */}
            {voice.sharing && call.localScreen && (
              <div className="bg-[#141620] border border-white/[0.06] rounded-2xl overflow-hidden relative sm:col-span-2 lg:col-span-2 aspect-video">
                <StreamVideo stream={call.localScreen} muted className="w-full h-full object-contain bg-black" />
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-[11px] font-semibold text-white">
                  Sua tela
                </div>
              </div>
            )}
          </>
        )}

        {remoteList.map((peer) => (
          <PeerTile key={peer.userId} peer={peer} deafened={audioDeafened} />
        ))}

        {!isConnected && remoteList.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 text-sm py-10">
            Ninguém transmitindo no momento. Conecte-se e ligue a câmera ou compartilhe a tela.
          </div>
        )}
      </div>

      {/* Dock de controles */}
      {isConnected && (
        <div className="max-w-xl mx-auto w-full bg-[#141620] border border-white/10 rounded-2xl p-3 flex items-center justify-center gap-3 shadow-2xl">
          <MediaButton onClick={toggleMic} title={call.serverMuted ? "Microfone silenciado pelo dono do servidor" : microphoneMuted ? "Ativar microfone" : "Silenciar"} off={microphoneMuted} disabled={call.serverMuted}>
            {microphoneMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </MediaButton>

          <MediaButton onClick={toggleCamera} title={voice.video ? "Desligar câmera" : "Ligar câmera"} off={!voice.video}>
            {voice.video ? <Video size={20} /> : <VideoOff size={20} />}
          </MediaButton>

          <MediaButton
            onClick={handleScreenClick}
            title={voice.sharing ? "Parar transmissão de tela" : "Transmitir tela"}
            off={!voice.sharing}
            active={voice.sharing}
          >
            <MonitorUp size={20} />
          </MediaButton>

          <MediaButton onClick={toggleDeafen} title={call.serverDeafened ? "Áudio silenciado pelo dono do servidor" : audioDeafened ? "Ativar áudio" : "Ensurdecer"} off={audioDeafened} disabled={call.serverDeafened}>
            <Headphones size={20} />
          </MediaButton>

          <button
            onClick={disconnect}
            className="w-16 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white grid place-items-center transition-all active:scale-95"
            title="Desconectar"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      )}

    </div>
  );
}
