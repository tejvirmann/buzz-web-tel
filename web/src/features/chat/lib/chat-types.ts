import type { NostrEvent, RelayConnectionState } from "@/shared/api/nostr-types";

export type ChannelType = "stream" | "forum" | "dm";
export type MemberRole = "owner" | "admin" | "member" | "guest" | "bot";

export type UserProfile = {
  pubkey: string;
  name: string;
  about: string;
  picture: string | null;
  isAgent: boolean;
};

export type ChannelMember = {
  pubkey: string;
  role: MemberRole;
};

export type BuzzChannel = {
  id: string;
  name: string;
  description: string;
  topic: string | null;
  type: ChannelType;
  visibility: "open" | "private";
  archived: boolean;
  isMember: boolean;
  members: ChannelMember[];
  participantPubkeys: string[];
};

export type ReactionGroup = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  currentUserEventIds: string[];
};

export type TimelineMessage = {
  event: NostrEvent;
  content: string;
  mentionPubkeys: string[];
  rootId: string | null;
  parentId: string | null;
  reactions: ReactionGroup[];
  edited: boolean;
  deleted: boolean;
  delivery: "sending" | "sent" | "failed";
};

export type SearchHit = {
  event: NostrEvent;
  channelId: string;
};

export type SessionState = {
  connectionState: RelayConnectionState;
  error: string | null;
  channels: BuzzChannel[];
  selectedChannelId: string | null;
  messages: TimelineMessage[];
  profiles: Record<string, UserProfile>;
  presence: Record<string, "online" | "away" | "offline">;
  typingPubkeys: string[];
  communityRole: MemberRole | null;
  loadingChannels: boolean;
  loadingMessages: boolean;
};

export type AttachmentDescriptor = {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
  dim?: string;
  blurhash?: string;
  thumb?: string;
  duration?: number;
  filename?: string;
};
