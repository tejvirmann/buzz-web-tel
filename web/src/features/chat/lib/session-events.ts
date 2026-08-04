import { fallbackProfile, tagValue } from "@/features/chat/lib/chat-model";
import type { UserProfile } from "@/features/chat/lib/chat-types";
import type { NostrEvent } from "@/shared/api/nostr-types";
import type { RuntimeConfig } from "@/shared/config/runtime-config";

export function mergeEvents(current: NostrEvent[], incoming: NostrEvent[]): NostrEvent[] {
  const events = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) events.set(event.id, event);
  return [...events.values()];
}

export function latestByTag(events: NostrEvent[], tagName: string): Map<string, NostrEvent> {
  const latest = new Map<string, NostrEvent>();
  for (const event of events) {
    const key = tagValue(event, tagName);
    if (key && (latest.get(key)?.created_at ?? 0) <= event.created_at) latest.set(key, event);
  }
  return latest;
}

export function profileSeed(config: RuntimeConfig, pubkey: string): Record<string, UserProfile> {
  const profiles: Record<string, UserProfile> = {
    [pubkey]: fallbackProfile(pubkey, "You"),
  };
  for (const agent of config.agents) {
    profiles[agent.pubkey] = fallbackProfile(agent.pubkey, agent.name, true);
  }
  return profiles;
}

export function eventChannelId(event: NostrEvent): string {
  return tagValue(event, "h") ?? "";
}

export function presenceSubject(event: NostrEvent): string {
  return tagValue(event, "p")?.toLowerCase() ?? event.pubkey.toLowerCase();
}

export function validPresence(value: string): value is "online" | "away" | "offline" {
  return value === "online" || value === "away" || value === "offline";
}

export function demoEvent(
  id: string,
  pubkey: string,
  channelId: string,
  content: string,
  createdAt: number,
  tags: string[][] = [],
): NostrEvent {
  return {
    id: id.padEnd(64, id[0] ?? "0").slice(0, 64),
    pubkey,
    kind: 9,
    content,
    created_at: createdAt,
    tags: [["h", channelId], ...tags],
    sig: "0".repeat(128),
  };
}

export function demoSystemEvent(
  id: string,
  relayPubkey: string,
  channelId: string,
  payload: Record<string, string>,
  createdAt: number,
): NostrEvent {
  return {
    ...demoEvent(id, relayPubkey, channelId, JSON.stringify(payload), createdAt),
    kind: 40099,
  };
}
