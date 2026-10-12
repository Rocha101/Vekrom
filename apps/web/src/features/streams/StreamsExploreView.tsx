import React, { useState } from "react";
import { Search, Flame, Eye, Play, Radio, Filter, Trophy, Sparkles } from "lucide-react";
import { CURRENT_STREAMER } from "../../lib/mockData";
import { LiveBadge } from "../../components/ui/Badges";

interface StreamsExploreViewProps {
  onSelectStreamer: (streamerId: string) => void;
}

const CATEGORIES = ["Todos", "VALORANT", "Overwatch 2", "League of Legends", "CS 2", "GTA RP"];

const FEATURED_STREAMS = [
  {
    id: "s1",
    title: "Radiant Ranked Grind with Squad! 🏆 Drops Enabled",
    streamer: "Awkiruun",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    game: "VALORANT",
    viewers: "4.2K",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    tags: ["Português", "Ranked", "Radiant"],
  },
  {
    id: "s2",
    title: "Torneio Comunitário Vekrom Cup - Semifinais!",
    streamer: "Ahmad Curtis",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    game: "Overwatch 2",
    viewers: "2.8K",
    thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
    tags: ["Torneio", "Esports", "Drops"],
  },
  {
    id: "s3",
    title: "Treino de Mira e Novas Estratégias do Patch",
    streamer: "Justin Schleifer",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
    game: "CS 2",
    viewers: "1.9K",
    thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80",
    tags: ["Competitivo", "Highlights"],
  },
];

export function StreamsExploreView({ onSelectStreamer }: StreamsExploreViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  const filteredStreams = FEATURED_STREAMS.filter((s) => {
    const matchesCat = selectedCategory === "Todos" || s.game === selectedCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.streamer.toLowerCase().includes(search.toLowerCase()) ||
      s.game.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] overflow-y-auto scroll-thin pb-24 md:pb-6">
      {/* Search & Header */}
      <div className="p-4 max-w-5xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Flame className="text-rose-500 fill-rose-500" />
              Ao Vivo Agora
            </h1>
            <p className="text-xs text-zinc-400">Assista e interaja com os melhores criadores da comunidade</p>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-none py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30 scale-105"
                  : "bg-[#161821] hover:bg-[#202330] text-zinc-300 border border-white/[0.05]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Stream Hero Highlight Card */}
        <div
          onClick={() => onSelectStreamer("awkiruun")}
          className="relative rounded-3xl overflow-hidden cursor-pointer group border border-white/10 shadow-2xl transition-all hover:scale-[1.01]"
        >
          <div className="aspect-[21/9] min-h-[220px] relative">
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80"
              alt="Highlight Stream"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-[#0d0e12]/40 to-transparent" />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <LiveBadge size="lg" />
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/10 flex items-center gap-1">
                <Eye size={12} /> 4.2K espectadores
              </span>
            </div>

            {/* Content Bottom */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={CURRENT_STREAMER.avatar}
                  alt="Awkiruun"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-500 shadow-lg"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {CURRENT_STREAMER.liveTitle}
                  </h3>
                  <p className="text-xs text-zinc-300">
                    {CURRENT_STREAMER.name} • {CURRENT_STREAMER.game}
                  </p>
                </div>
              </div>

              <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-600/40">
                <Play size={16} fill="white" />
                Assistir
              </button>
            </div>
          </div>
        </div>

        {/* Streams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredStreams.map((stream) => (
            <div
              key={stream.id}
              onClick={() => onSelectStreamer("awkiruun")}
              className="bg-[#161821] hover:bg-[#1c1f2b] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-xl"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={stream.thumbnail}
                  alt={stream.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <LiveBadge size="sm" />
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/10 flex items-center gap-1">
                    <Eye size={10} /> {stream.viewers}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-blue-600/80 backdrop-blur-sm text-[10px] font-bold text-white">
                  {stream.game}
                </div>
              </div>

              <div className="p-3 flex items-start gap-3">
                <img
                  src={stream.avatar}
                  alt={stream.streamer}
                  className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                    {stream.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{stream.streamer}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {stream.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-zinc-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
