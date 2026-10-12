export interface StreamerProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  bio: string;
  isLive: boolean;
  liveTitle?: string;
  game?: string;
  viewers?: string;
  following: string;
  followers: string;
  videos: string;
  recentStreams: Array<{
    id: string;
    title: string;
    game: string;
    viewers: string;
    isLive: boolean;
    thumbnail: string;
    duration?: string;
  }>;
}

export interface SocialUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  followers: string;
  verified: boolean;
  status: "streaming" | "online" | "idle" | "offline" | "dnd";
  bio?: string;
  activity?: string;
  badge?: string;
  game?: string;
  unreadCount?: number;
  lastMessage?: string;
  lastActive?: string;
  streak?: boolean;
}

export interface DirectMessageThread {
  user: SocialUser;
  messages: Array<{
    id: string;
    sender: "them" | "me";
    text: string;
    time: string;
  }>;
}

export const CURRENT_STREAMER: StreamerProfile = {
  id: "awkiruun",
  name: "Awkiruun",
  handle: "@Awkiruun",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80",
  bio: "I'm back stream valorant\nWatch me stream everyday",
  isLive: true,
  liveTitle: "Radiant Ranked Grind with Squad! 🏆 Drops Enabled",
  game: "VALORANT",
  viewers: "4.2K",
  following: "123",
  followers: "10M",
  videos: "109",
  recentStreams: [
    {
      id: "s1",
      title: "Climbing to Radiant Rank! High ELO",
      game: "VALORANT",
      viewers: "4.2K",
      isLive: true,
      thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "s2",
      title: "Warmup Aim Routine + Scrims Day 4",
      game: "VALORANT",
      viewers: "5.2K",
      isLive: false,
      duration: "3:42:10",
      thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "s3",
      title: "New Agent Tactics Breakdown & Meta",
      game: "VALORANT",
      viewers: "3.8K",
      isLive: false,
      duration: "2:15:40",
      thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
    },
  ],
};

export const SOCIAL_PEOPLE: SocialUser[] = [
  {
    id: "val_boys",
    name: "Valorant boyS",
    handle: "@valboys",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    followers: "636 Follower",
    verified: true,
    status: "online",
    bio: "Campeão VCT BR 🏆 • Scrims diárias",
    lastActive: "10m ago",
  },
  {
    id: "valo_buy",
    name: "vALO bUY",
    handle: "@valobuy",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    followers: "636 Follower",
    verified: true,
    status: "dnd",
    bio: "Marketplace oficial de skins e VP",
    lastActive: "1h ago",
  },
  {
    id: "david_valo",
    name: "dAVID vALO",
    handle: "@davidvalo",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    followers: "636 Follower",
    verified: true,
    status: "offline",
    bio: "UI/UX & FPS competitivo",
    lastActive: "2h ago",
  },
];

export const STREAMING_PEOPLE: SocialUser[] = [
  {
    id: "ahmad_curtis",
    name: "Ahmad Curtis",
    handle: "@ahmadcurtis",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    followers: "636 Follower",
    verified: true,
    status: "streaming",
    game: "VALORANT",
  },
  {
    id: "justin_schleifer",
    name: "Justin Schleifer",
    handle: "@justins",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
    followers: "636 Follower",
    verified: true,
    status: "streaming",
    game: "Overwatch 2",
  },
  {
    id: "marcus_kenter",
    name: "Marcus Kenter",
    handle: "@marcusk",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    followers: "636 Follower",
    verified: true,
    status: "streaming",
    game: "Apex Legends",
  },
  {
    id: "zaire_arcand",
    name: "Zaire Passaquindici Arcand",
    handle: "@zaire_arc",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    followers: "636 Follower",
    verified: true,
    status: "streaming",
    game: "League of Legends",
  },
];

export const JESUS_BROWN_CHAT: DirectMessageThread = {
  user: {
    id: "jesus_brown",
    name: "Jesus Brown",
    handle: "@jesusbrown",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
    followers: "12.4K Follower",
    verified: true,
    status: "online",
    streak: true,
    bio: "Radiant grinder • Afk coder",
    activity: "Jogando VALORANT",
    lastActive: "3m ago",
  },
  messages: [
    {
      id: "m1",
      sender: "them",
      text: "Thank you, I have installed the plugin, I just need to wait until the file finishes downloading.",
      time: "3m ago",
    },
    {
      id: "m2",
      sender: "them",
      text: "i get back to work now",
      time: "2m ago",
    },
    {
      id: "m3",
      sender: "me",
      text: "Sure, just call me if you done",
      time: "1m ago",
    },
    {
      id: "m4",
      sender: "them",
      text: "OK",
      time: "Just now",
    },
  ],
};
