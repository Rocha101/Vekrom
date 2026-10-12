/**
 * Efeitos sonoros para chamadas de voz sintetizados com Web Audio API.
 * Sem arquivos externos ou atrasos de rede: reprodução instantânea com zero latência.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  endFreq?: number;
  type?: OscillatorType;
  startTime: number;
  duration: number;
  gain?: number;
  ctx: AudioContext;
}

function playTone({
  freq,
  endFreq,
  type = "sine",
  startTime,
  duration,
  gain = 0.15,
  ctx,
}: ToneOptions) {
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== undefined && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), startTime + duration);
    }

    // Envelope suave para evitar estalos (clipping)
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch {
    /* falha silenciosa para navegadores sem suporte */
  }
}

/**
 * Toca o som característico ao entrar em uma chamada de voz.
 * Acorde ascendente harmônico e cristalino (estilo Discord/moderno).
 */
export function playJoinCallSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 440, endFreq: 440, type: "sine", startTime: now, duration: 0.12, gain: 0.18, ctx });
  playTone({ freq: 659.25, endFreq: 659.25, type: "sine", startTime: now + 0.1, duration: 0.35, gain: 0.22, ctx });
  playTone({ freq: 1318.5, endFreq: 1318.5, type: "sine", startTime: now + 0.1, duration: 0.22, gain: 0.05, ctx });
}

/**
 * Toca o som ao sair/desconectar de uma chamada de voz.
 * Acorde descendente suave.
 */
export function playLeaveCallSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 659.25, endFreq: 659.25, type: "sine", startTime: now, duration: 0.12, gain: 0.18, ctx });
  playTone({ freq: 440, endFreq: 440, type: "sine", startTime: now + 0.1, duration: 0.3, gain: 0.18, ctx });
}

/**
 * Toca o som ao desligar (mutar) o microfone.
 * Tom descendente nítido e característico de fechamento.
 */
export function playMuteSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 480, endFreq: 240, type: "sine", startTime: now, duration: 0.08, gain: 0.2, ctx });
  playTone({ freq: 240, endFreq: 140, type: "triangle", startTime: now + 0.06, duration: 0.09, gain: 0.18, ctx });
}

/**
 * Toca o som ao ligar (desmutar) o microfone.
 * Tom ascendente brilhante de ativação de microfone.
 */
export function playUnmuteSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 260, endFreq: 480, type: "sine", startTime: now, duration: 0.07, gain: 0.18, ctx });
  playTone({ freq: 480, endFreq: 680, type: "sine", startTime: now + 0.05, duration: 0.12, gain: 0.2, ctx });
}

/**
 * Toca o som ao desligar os fones (ensurdecer/desativar áudio).
 * Tom duplo abafado e grave indicando áudio completamente silenciado.
 */
export function playDeafenSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 340, endFreq: 200, type: "triangle", startTime: now, duration: 0.09, gain: 0.22, ctx });
  playTone({ freq: 200, endFreq: 110, type: "triangle", startTime: now + 0.07, duration: 0.14, gain: 0.24, ctx });
}

/**
 * Toca o som ao reativar os fones (desativar ensurdecer).
 * Tom duplo ascendente e aberto indicando áudio restaurado.
 */
export function playUndeafenSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 180, endFreq: 320, type: "triangle", startTime: now, duration: 0.08, gain: 0.18, ctx });
  playTone({ freq: 320, endFreq: 580, type: "sine", startTime: now + 0.06, duration: 0.14, gain: 0.22, ctx });
}
