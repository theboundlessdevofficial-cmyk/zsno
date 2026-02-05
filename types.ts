
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type UserStatus = 'Online' | 'Away' | 'Do Not Disturb';

export interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  isVerified: boolean;
  avatar: string;
  status: UserStatus; // Added status field
  friends: string[]; 
  blockedUsers: string[]; 
  blockedGroups: string[]; 
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'system';
  imageUrl?: string;
}

export interface GroupChat {
  id: string;
  name: string;
  description: string;
  pfp: string;
  isPrivate: boolean;
  ownerId: string;
  members: string[]; 
  roles: Record<string, MemberRole>; // Map of user IDs to roles
  mutedUsers: string[]; // List of user IDs currently muted in this hub
  messages: Message[];
  isDM?: boolean; 
}

export type AspectRatio = '1:1' | '2:3' | '3:2' | '4:3' | '9:16' | '16:9' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface ModerationResult {
  isHarmful: boolean;
  reason: string;
  verdict: 'safe' | 'unsafe';
}
