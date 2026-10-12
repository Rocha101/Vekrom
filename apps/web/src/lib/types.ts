export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatarUrl: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
}

export interface Channel {
  id: string;
  serverId: string | null;
  name: string;
  type: 'text' | 'voice' | 'video' | 'dm';
  topic?: string | null;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  author?: User;
  content: string;
  attachments?: Attachment[];
  createdAt: string;
  editedAt?: string | null;
}

export interface Attachment {
  id: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
}

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string;
  permissions: string[];
  position: number;
}

export interface Presence {
  userId: string;
  status: User['status'];
  lastSeen: string;
}
