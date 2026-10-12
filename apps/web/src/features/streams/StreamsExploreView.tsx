import { Radio } from "lucide-react";

export function StreamsExploreView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#0d0e12] px-6 pb-24 text-center md:pb-6">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-[#161821] text-zinc-400"><Radio size={28} /></div>
      <h1 className="mt-5 text-xl font-bold text-white">Transmissões ao vivo</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">Nenhuma transmissão está disponível no momento.</p>
    </div>
  );
}
