import { channelFromEvents, tagValue } from "@/features/chat/lib/chat-model";
import type { BuzzChannel } from "@/features/chat/lib/chat-types";
import { latestByTag, mergeEvents } from "@/features/chat/lib/session-events";
import type { NostrEvent } from "@/shared/api/nostr-types";

function isPrivateMetadata(event: NostrEvent): boolean {
  return event.tags.some((tag) => tag.length === 1 && tag[0] === "private");
}

export function membershipQueryChannelIds(
  metadataEvents: NostrEvent[],
  ownMemberEvents: NostrEvent[],
): string[] {
  const ownChannelIds = new Set(latestByTag(ownMemberEvents, "d").keys());
  return [...latestByTag(metadataEvents, "d")]
    .filter(([channelId, metadata]) => ownChannelIds.has(channelId) || !isPrivateMetadata(metadata))
    .map(([channelId]) => channelId);
}

export function buildDiscoveredChannels({
  metadataEvents,
  memberEvents,
  ownMemberEvents,
  currentPubkey,
}: {
  metadataEvents: NostrEvent[];
  memberEvents: NostrEvent[];
  ownMemberEvents: NostrEvent[];
  currentPubkey: string;
}): BuzzChannel[] {
  const metadataById = latestByTag(metadataEvents, "d");
  const membersByChannel = latestByTag(mergeEvents(memberEvents, ownMemberEvents), "d");
  return [...metadataById]
    .map(([id, metadata]) => channelFromEvents(metadata, membersByChannel.get(id), currentPubkey))
    .filter((channel): channel is BuzzChannel => channel !== null)
    .filter(
      (channel) =>
        channel.isMember ||
        (!channel.archived && channel.visibility === "open" && channel.type !== "dm"),
    )
    .sort((left, right) => {
      if (left.type === "dm" && right.type !== "dm") return 1;
      if (left.type !== "dm" && right.type === "dm") return -1;
      return left.name.localeCompare(right.name);
    });
}

export function metadataChannelIdsMissingFrom(
  metadataEvents: NostrEvent[],
  ownMemberEvents: NostrEvent[],
): string[] {
  const metadataIds = new Set(
    metadataEvents.map((event) => tagValue(event, "d")).filter((id): id is string => Boolean(id)),
  );
  return [...latestByTag(ownMemberEvents, "d").keys()].filter((id) => !metadataIds.has(id));
}
