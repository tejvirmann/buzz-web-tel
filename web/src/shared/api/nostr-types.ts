import type { SignedNostrEvent, UnsignedNostrEvent } from "@/shared/lib/nostr-signer";

export type NostrEvent = SignedNostrEvent;
export type EventTemplate = Omit<UnsignedNostrEvent, "created_at"> & { created_at?: number };

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  search?: string;
  [tag: `#${string}`]: string[] | undefined;
}

export type RelayConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type RelayPublishResult = {
  event: NostrEvent;
  message: string;
};
