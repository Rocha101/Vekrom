import React, { createContext, useContext } from "react";
import { useVoiceCall } from "../../voice-call";
import { useVoice } from "../../stores";

type Call = ReturnType<typeof useVoiceCall>;

const VoiceCallCtx = createContext<Call | null>(null);

/**
 * Mantém UMA chamada viva para o app inteiro — navegar entre canais de texto
 * não derruba a voz (estilo Discord). A instância segue o canal ativo no store.
 */
export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const channelId = useVoice((s) => s.channelId);
  const call = useVoiceCall(channelId);
  return <VoiceCallCtx.Provider value={call}>{children}</VoiceCallCtx.Provider>;
}

export function useVoiceCallCtx(): Call {
  const ctx = useContext(VoiceCallCtx);
  if (!ctx) throw new Error("useVoiceCallCtx fora do VoiceProvider");
  return ctx;
}
