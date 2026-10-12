export interface StreamerProfile {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  banner?: string | null;
  bio?: string;
  isLive?: boolean;
  liveTitle?: string;
  game?: string;
  viewers?: string;
  following?: string;
  followers?: string;
  videos?: string;
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
  avatar?: string | null;
  status?: "streaming" | "online" | "idle" | "offline" | "dnd";
  bio?: string;
  activity?: string;
  badge?: string;
  verified?: boolean;
  streak?: boolean;
  lastActive?: string;
}
