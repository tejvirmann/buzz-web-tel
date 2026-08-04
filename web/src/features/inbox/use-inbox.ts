import { useCallback, useEffect, useMemo, useState } from "react";
import { tagValue } from "@/features/chat/lib/chat-model";
import type { BuzzChannel } from "@/features/chat/lib/chat-types";
import { buildInboxItems, INBOX_EVENT_KINDS } from "@/features/inbox/lib/inbox-model";
import type { NostrEvent } from "@/shared/api/nostr-types";
import type { BuzzRelayClient } from "@/shared/api/relay-client";
import type { ConfiguredAgent } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";

function mergeEvents(current: NostrEvent[], incoming: NostrEvent[]): NostrEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()];
}

function readStateKey(relayUrl: string, pubkey: string): string {
  return `buzz:web:inbox-read:${encodeURIComponent(relayUrl)}:${pubkey.toLowerCase()}`;
}

function loadReadIds(key: string): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return new Set(
      Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function demoInboxEvents(
  channels: readonly BuzzChannel[],
  currentPubkey: string,
  configuredAgents: readonly ConfiguredAgent[],
): NostrEvent[] {
  const general = channels.find((channel) => channel.type !== "dm")?.id ?? "general";
  const dm = channels.find((channel) => channel.type === "dm")?.id ?? "dm";
  const agent = configuredAgents[0]?.pubkey ?? "a".repeat(64);
  const now = Math.floor(Date.now() / 1000);
  const event = (
    id: string,
    pubkey: string,
    kind: number,
    content: string,
    createdAt: number,
    tags: string[][],
  ): NostrEvent => ({
    id: id.repeat(64).slice(0, 64),
    pubkey,
    kind,
    content,
    created_at: createdAt,
    tags,
    sig: "0".repeat(128),
  });
  const rootId = "c".repeat(64);
  return [
    event("1", agent, 9, "Can you review the deployment checklist?", now - 55, [
      ["h", general],
      ["p", currentPubkey],
    ]),
    event("2", agent, 9, "The Relay health checks are all passing.", now - 115, [
      ["h", dm],
      ["p", currentPubkey],
    ]),
    event("c", currentPubkey, 9, "Please post the verification result here.", now - 240, [
      ["h", general],
    ]),
    event("3", agent, 9, "Verification is complete and the result is attached.", now - 180, [
      ["h", general],
      ["e", rootId, "", "reply"],
    ]),
    event("4", agent, 46010, "Production rollout is waiting for approval.", now - 320, [
      ["h", general],
      ["p", currentPubkey],
      ["d", "d".repeat(64)],
    ]),
  ];
}

export function useInbox({
  client,
  demo,
  relayUrl,
  currentPubkey,
  configuredAgents,
  channels,
  ensureProfiles,
}: {
  client: BuzzRelayClient | null;
  demo: boolean;
  relayUrl: string;
  currentPubkey: string;
  configuredAgents: readonly ConfiguredAgent[];
  channels: readonly BuzzChannel[];
  ensureProfiles: (pubkeys: string[]) => Promise<void>;
}) {
  const storageKey = useMemo(
    () => readStateKey(relayUrl, currentPubkey),
    [currentPubkey, relayUrl],
  );
  const [events, setEvents] = useState<NostrEvent[]>(() =>
    demo ? demoInboxEvents(channels, currentPubkey, configuredAgents) : [],
  );
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(storageKey));
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  const [approvalPending, setApprovalPending] = useState<string | null>(null);
  const channelIdsKey = channels
    .map((channel) => channel.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (demo && channelIdsKey) {
      setEvents(demoInboxEvents(channels, currentPubkey, configuredAgents));
    }
  }, [channelIdsKey, channels, configuredAgents, currentPubkey, demo]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...readIds].slice(-2_000)));
    } catch {
      // Private browsing policies may disable local persistence.
    }
  }, [readIds, storageKey]);

  const refresh = useCallback(async () => {
    if (!client || demo) return;
    setLoading(true);
    try {
      const channelIds = channels.map((channel) => channel.id);
      const results = await Promise.all([
        client.query({ kinds: INBOX_EVENT_KINDS, "#p": [currentPubkey], limit: 500 }),
        channelIds.length
          ? client.query({ kinds: INBOX_EVENT_KINDS, "#h": channelIds, limit: 1_000 })
          : Promise.resolve([]),
      ]);
      const nextEvents = mergeEvents([], results.flat());
      setEvents(nextEvents);
      await ensureProfiles(nextEvents.map((event) => event.pubkey));
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : t("error.inboxLoad"));
    } finally {
      setLoading(false);
    }
  }, [channels, client, currentPubkey, demo, ensureProfiles]);

  useEffect(() => {
    if (!client || demo) return;
    let cancelled = false;
    const unsubscribers: Array<() => void> = [];
    const since = Math.floor(Date.now() / 1000) - 3;
    const channelIds = channelIdsKey ? channelIdsKey.split(",") : [];
    const receive = (event: NostrEvent) => {
      setEvents((current) => mergeEvents(current, [event]));
      void ensureProfiles([event.pubkey]);
    };
    void refresh();
    const filters = [
      { kinds: INBOX_EVENT_KINDS, "#p": [currentPubkey], since, limit: 0 },
      ...(channelIds.length
        ? [{ kinds: INBOX_EVENT_KINDS, "#h": channelIds, since, limit: 0 }]
        : []),
    ];
    for (const filter of filters) {
      void client
        .subscribe(filter, receive)
        .then((unsubscribe) => {
          if (cancelled) unsubscribe();
          else unsubscribers.push(unsubscribe);
        })
        .catch((subscribeError) => {
          if (!cancelled) {
            setError(
              subscribeError instanceof Error ? subscribeError.message : t("error.inboxLoad"),
            );
          }
        });
    }
    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [channelIdsKey, client, currentPubkey, demo, ensureProfiles, refresh]);

  const items = useMemo(
    () => buildInboxItems({ events, channels, currentPubkey, readIds }),
    [channels, currentPubkey, events, readIds],
  );
  const unreadCount = items.filter((item) => item.unread).length;
  const markRead = useCallback((id: string) => {
    setReadIds((current) => new Set([...current, id]));
  }, []);
  const markUnread = useCallback((id: string) => {
    setReadIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);
  const markAllRead = useCallback(() => {
    setReadIds((current) => new Set([...current, ...items.map((item) => item.id)]));
  }, [items]);
  const respondToApproval = useCallback(
    async (event: NostrEvent, approved: boolean) => {
      setApprovalPending(event.id);
      try {
        const reference = tagValue(event, "d");
        if (!reference || !/^[0-9a-f]{64}$/i.test(reference)) {
          throw new Error(t("error.approvalReference"));
        }
        if (!demo) {
          if (!client) throw new Error(t("error.relayClient"));
          await client.publish({
            kind: approved ? 46030 : 46031,
            content: "",
            tags: [["d", reference.toLowerCase()]],
          });
        }
        markRead(event.id);
        setEvents((current) => current.filter((item) => item.id !== event.id));
        setError(null);
      } catch (approvalError) {
        setError(
          approvalError instanceof Error ? approvalError.message : t("error.approvalUpdate"),
        );
      } finally {
        setApprovalPending(null);
      }
    },
    [client, demo, markRead],
  );

  return {
    items,
    unreadCount,
    loading,
    error,
    approvalPending,
    refresh,
    markRead,
    markUnread,
    markAllRead,
    respondToApproval,
  };
}
