import { tagValue, tagValues, threadReference } from "@/features/chat/lib/chat-model";
import type { BuzzChannel } from "@/features/chat/lib/chat-types";
import type { NostrEvent } from "@/shared/api/nostr-types";

export const INBOX_EVENT_KINDS = [1, 9, 40002, 45001, 45003, 46010, 46011, 46012];

export type InboxCategory = "mention" | "dm" | "thread" | "needs_action";

export type InboxItem = {
  id: string;
  event: NostrEvent;
  category: InboxCategory;
  channelId: string | null;
  threadRootId: string | null;
  unread: boolean;
};

export function inboxPreview(event: NostrEvent): string {
  const content = event.content.trim();
  if (!content.startsWith("{")) return content;
  try {
    const value = JSON.parse(content) as Record<string, unknown>;
    const preview = value.message ?? value.summary ?? value.title ?? value.text ?? value.action;
    return typeof preview === "string" ? preview : content;
  } catch {
    return content;
  }
}

export function buildInboxItems({
  events,
  channels,
  currentPubkey,
  readIds,
}: {
  events: readonly NostrEvent[];
  channels: readonly BuzzChannel[];
  currentPubkey: string;
  readIds: ReadonlySet<string>;
}): InboxItem[] {
  const current = currentPubkey.toLowerCase();
  const channelsById = new Map(channels.map((channel) => [channel.id, channel]));
  const authoredIds = new Set(
    events.filter((event) => event.pubkey.toLowerCase() === current).map((event) => event.id),
  );
  const unique = new Map(events.map((event) => [event.id, event]));
  const resolvedApprovals = new Set(
    [...unique.values()]
      .filter((event) => event.kind === 46011 || event.kind === 46012)
      .map((event) => tagValue(event, "d"))
      .filter((value): value is string => Boolean(value)),
  );

  return [...unique.values()]
    .filter(
      (event) =>
        INBOX_EVENT_KINDS.includes(event.kind) &&
        event.pubkey.toLowerCase() !== current &&
        !(event.kind === 46010 && resolvedApprovals.has(tagValue(event, "d") ?? "")),
    )
    .map((event): InboxItem | null => {
      const channelId = tagValue(event, "h");
      const channel = channelId ? channelsById.get(channelId) : undefined;
      const refs = threadReference(event);
      const referencedOwnMessage = event.tags
        .filter((tag) => tag[0] === "e")
        .some((tag) => authoredIds.has(tag[1] ?? ""));
      const mentioned = tagValues(event, "p").some((value) => value.toLowerCase() === current);
      let category: InboxCategory | null = null;
      if (event.kind === 46010) category = "needs_action";
      else if (channel?.type === "dm") category = "dm";
      else if (refs.parentId && referencedOwnMessage) category = "thread";
      else if (mentioned) category = "mention";
      if (!category) return null;
      return {
        id: event.id,
        event,
        category,
        channelId,
        threadRootId: refs.parentId ? refs.rootId : null,
        unread: !readIds.has(event.id),
      };
    })
    .filter((item): item is InboxItem => item !== null)
    .sort((left, right) => right.event.created_at - left.event.created_at);
}
