export interface VoiceState {
  userId: string;
  channelId: string;
  mute: boolean;
  deaf: boolean;
  speaking: boolean;
  camera: boolean;
  sharing: boolean;
  updatedAt: number;
}

/**
 * Mapa channelId -> participantes.
 * Estado local "quente"; o relay entre instâncias acontece via Redis (pubsub.ts).
 * Speaking indicator: relay efêmero — atualiza flag e expira via updatedAt.
 */
export class VoiceManager {
  private channels = new Map<string, Map<string, VoiceState>>();

  join(userId: string, channelId: string, partial?: { mute?: boolean; deaf?: boolean; camera?: boolean; sharing?: boolean }): VoiceState {
    let members = this.channels.get(channelId);
    if (!members) {
      members = new Map();
      this.channels.set(channelId, members);
    }
    const prev = members.get(userId);
    const state: VoiceState = {
      userId,
      channelId,
      mute: partial?.mute ?? prev?.mute ?? false,
      deaf: partial?.deaf ?? prev?.deaf ?? false,
      speaking: false,
      camera: partial?.camera ?? prev?.camera ?? false,
      sharing: partial?.sharing ?? prev?.sharing ?? false,
      updatedAt: Date.now(),
    };
    members.set(userId, state);
    return state;
  }

  leave(userId: string): { channelId: string } | null {
    for (const [channelId, members] of this.channels.entries()) {
      if (members.delete(userId)) {
        if (members.size === 0) this.channels.delete(channelId);
        return { channelId };
      }
    }
    return null;
  }

  /** Usuário só pode estar em 1 canal de voz por vez. */
  currentChannelOf(userId: string): string | null {
    for (const [channelId, members] of this.channels.entries()) {
      if (members.has(userId)) return channelId;
    }
    return null;
  }

  setSpeaking(userId: string, speaking: boolean): VoiceState | null {
    const channelId = this.currentChannelOf(userId);
    if (!channelId) return null;
    const st = this.channels.get(channelId)?.get(userId);
    if (!st) return null;
    st.speaking = speaking;
    st.updatedAt = Date.now();
    return st;
  }

  setFlags(userId: string, flags: { mute?: boolean; deaf?: boolean; camera?: boolean; sharing?: boolean }): VoiceState | null {
    const channelId = this.currentChannelOf(userId);
    if (!channelId) return null;
    const st = this.channels.get(channelId)?.get(userId);
    if (!st) return null;
    if (flags.mute !== undefined) st.mute = flags.mute;
    if (flags.deaf !== undefined) st.deaf = flags.deaf;
    if (flags.camera !== undefined) st.camera = flags.camera;
    if (flags.sharing !== undefined) st.sharing = flags.sharing;
    st.updatedAt = Date.now();
    return st;
  }

  /** Aplica estado vindo de outra instância (relay). */
  applyRemote(state: VoiceState): void {
    // remove de outros canais (single-channel invariant)
    for (const [cid, members] of this.channels.entries()) {
      if (cid !== state.channelId) members.delete(state.userId);
    }
    let members = this.channels.get(state.channelId);
    if (!members) {
      members = new Map();
      this.channels.set(state.channelId, members);
    }
    members.set(state.userId, state);
  }

  applyRemoteLeave(userId: string, channelId: string): void {
    const members = this.channels.get(channelId);
    members?.delete(userId);
    if (members && members.size === 0) this.channels.delete(channelId);
  }

  participants(channelId: string): VoiceState[] {
    return [...(this.channels.get(channelId)?.values() ?? [])];
  }
}
