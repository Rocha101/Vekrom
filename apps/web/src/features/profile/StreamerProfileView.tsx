import { ChevronLeft, UserRound } from "lucide-react";
import type { StreamerProfile } from "../../lib/types";

interface StreamerProfileViewProps {
  streamer: StreamerProfile;
  onBack?: () => void;
}

export function StreamerProfileView({ streamer, onBack }: StreamerProfileViewProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0e12] pb-24 md:pb-6">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] bg-[#0d0e12]/90 px-4 py-3 backdrop-blur-md">
        <button onClick={onBack} className="rounded-full p-2 text-zinc-300 hover:bg-white/10" aria-label="Voltar"><ChevronLeft size={22} /></button>
        <h1 className="text-base font-bold text-white">Perfil</h1>
      </header>
      <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10 text-center">
        {streamer.avatar ? <img src={streamer.avatar} alt={streamer.name} className="h-24 w-24 rounded-full border border-white/10 object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-full border border-white/10 bg-[#161821] text-zinc-400"><UserRound size={36} /></div>}
        <h2 className="mt-4 text-xl font-bold text-white">{streamer.name}</h2>
        <p className="mt-1 text-sm text-zinc-400">{streamer.handle}</p>
        {streamer.bio && <p className="mt-4 max-w-lg whitespace-pre-wrap text-sm text-zinc-300">{streamer.bio}</p>}
        <div className="mt-8 w-full rounded-xl border border-white/[0.06] bg-[#14161f] p-6">
          <h3 className="text-sm font-semibold text-white">Transmissões recentes</h3>
          <p className="mt-2 text-sm text-zinc-400">Nenhuma transmissão disponível.</p>
        </div>
      </section>
    </div>
  );
}
