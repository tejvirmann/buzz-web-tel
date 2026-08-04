import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUXILIARY_KINDS,
  buildMessageTags,
  buildTimeline,
  channelFromEvents,
  fallbackProfile,
  messageRecipientPubkeys,
  parseCommunityRole,
  profilesFromEvents,
  systemMessagePubkeys,
  TIMELINE_KINDS,
  tagValue,
} from "@/features/chat/lib/chat-model";
import type {
  AttachmentDescriptor,
  BuzzChannel,
  ChannelType,
  SearchHit,
  SessionState,
  TimelineMessage,
  UserProfile,
} from "@/features/chat/lib/chat-types";
import type { NostrEvent, RelayConnectionState } from "@/shared/api/nostr-types";
import type { BuzzRelayClient } from "@/shared/api/relay-client";
import type { RuntimeConfig } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";
import { signNostrEvent } from "@/shared/lib/nostr-signer";

type CreateChannelInput = {
  name: string;
  description: string;
  type: Exclude<ChannelType, "dm">;
  visibility: "open" | "private";
};

type ReplyTarget = { id: string; rootId: string; authorPubkey: string } | null;

function mergeEvents(current: NostrEvent[], incoming: NostrEvent[]): NostrEvent[] {
  const events = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) events.set(event.id, event);
  return [...events.values()];
}

function latestByTag(events: NostrEvent[], tagName: string): Map<string, NostrEvent> {
  const latest = new Map<string, NostrEvent>();
  for (const event of events) {
    const key = tagValue(event, tagName);
    if (key && (latest.get(key)?.created_at ?? 0) <= event.created_at) latest.set(key, event);
  }
  return latest;
}

function profileSeed(config: RuntimeConfig, pubkey: string): Record<string, UserProfile> {
  const profiles: Record<string, UserProfile> = {
    [pubkey]: fallbackProfile(pubkey, "You"),
  };
  for (const agent of config.agents) {
    profiles[agent.pubkey] = fallbackProfile(agent.pubkey, agent.name, true);
  }
  return profiles;
}

function eventChannelId(event: NostrEvent): string {
  return tagValue(event, "h") ?? "";
}

function presenceSubject(event: NostrEvent): string {
  return tagValue(event, "p")?.toLowerCase() ?? event.pubkey.toLowerCase();
}

function validPresence(value: string): value is "online" | "away" | "offline" {
  return value === "online" || value === "away" || value === "offline";
}

function demoEvent(
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

function demoSystemEvent(
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

export function useBuzzSession({
  client,
  config,
  pubkey,
  demo,
}: {
  client: BuzzRelayClient | null;
  config: RuntimeConfig;
  pubkey: string;
  demo: boolean;
}) {
  const [connectionState, setConnectionState] = useState<RelayConnectionState>(
    demo ? "connected" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<BuzzChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [contentEvents, setContentEvents] = useState<NostrEvent[]>([]);
  const [auxiliaryEvents, setAuxiliaryEvents] = useState<NostrEvent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>(() =>
    profileSeed(config, pubkey),
  );
  const [presence, setPresence] = useState<Record<string, "online" | "away" | "offline">>({});
  const [typingExpiry, setTypingExpiry] = useState<Record<string, number>>({});
  const [communityRole, setCommunityRole] = useState<SessionState["communityRole"]>(
    demo ? "owner" : null,
  );
  const [loadingChannels, setLoadingChannels] = useState(!demo);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [delivery, setDelivery] = useState<Record<string, "sending" | "failed">>({});
  const typingSentAt = useRef(0);
  const reactionPending = useRef(new Set<string>());
  const presenceUpdatedAt = useRef<Record<string, number>>({});
  const agentPubkeys = useMemo(
    () => new Set(config.agents.map((agent) => agent.pubkey.toLowerCase())),
    [config.agents],
  );

  const loadProfiles = useCallback(
    async (pubkeys: string[]) => {
      if (!client || demo) return;
      const unique = [...new Set(pubkeys.map((value) => value.toLowerCase()))].filter((value) =>
        /^[0-9a-f]{64}$/.test(value),
      );
      if (!unique.length) return;
      const events = await client.query({ kinds: [0], authors: unique, limit: unique.length });
      const parsed = profilesFromEvents(events, agentPubkeys);
      setProfiles((current) => {
        const next = { ...current, ...parsed };
        for (const agent of config.agents) {
          const existing = next[agent.pubkey] ?? fallbackProfile(agent.pubkey, agent.name, true);
          next[agent.pubkey] = {
            ...existing,
            name: parsed[agent.pubkey]?.name || agent.name,
            isAgent: true,
          };
        }
        return next;
      });
    },
    [agentPubkeys, client, config.agents, demo],
  );

  const applyPresenceEvents = useCallback(
    (events: NostrEvent[], replaceSubjects: string[] = []) => {
      const now = Date.now();
      setPresence((current) => {
        const next = { ...current };
        for (const subject of replaceSubjects) {
          const normalized = subject.toLowerCase();
          next[normalized] = "offline";
          delete presenceUpdatedAt.current[normalized];
        }
        for (const event of events) {
          if (!validPresence(event.content)) continue;
          const subject = presenceSubject(event);
          next[subject] = event.content;
          presenceUpdatedAt.current[subject] = now;
        }
        return next;
      });
    },
    [],
  );

  const loadChannels = useCallback(async () => {
    if (!client || demo) return;
    setLoadingChannels(true);
    try {
      const [memberEvents, roleEvents] = await Promise.all([
        client.query({ kinds: [39002], "#p": [pubkey], limit: 500 }),
        client.query({ kinds: [13534], limit: 1 }),
      ]);
      const membersByChannel = latestByTag(memberEvents, "d");
      const channelIds = [...membersByChannel.keys()];
      const metadataEvents = channelIds.length
        ? await client.query({ kinds: [39000], "#d": channelIds, limit: 500 })
        : [];
      const channelsById = latestByTag(metadataEvents, "d");
      const nextChannels = channelIds
        .map((id) => {
          const metadata = channelsById.get(id);
          return metadata ? channelFromEvents(metadata, membersByChannel.get(id)) : null;
        })
        .filter((channel): channel is BuzzChannel => channel !== null && !channel.archived)
        .sort((left, right) => {
          if (left.type === "dm" && right.type !== "dm") return 1;
          if (left.type !== "dm" && right.type === "dm") return -1;
          return left.name.localeCompare(right.name);
        });
      setChannels(nextChannels);
      setSelectedChannelId((current) =>
        current && nextChannels.some((channel) => channel.id === current)
          ? current
          : (nextChannels.find((channel) => channel.name === "general")?.id ??
            nextChannels[0]?.id ??
            null),
      );
      setCommunityRole(parseCommunityRole(roleEvents[0], pubkey));
      const profilePubkeys = [
        pubkey,
        ...config.agents.map((agent) => agent.pubkey),
        ...nextChannels.flatMap((channel) => channel.members.map((member) => member.pubkey)),
      ];
      await Promise.all([
        loadProfiles(profilePubkeys),
        client
          .queryHttp([
            {
              kinds: [40902],
              authors: [...new Set(profilePubkeys.map((value) => value.toLowerCase()))],
              limit: profilePubkeys.length,
            },
          ])
          .then((events) => applyPresenceEvents(events, profilePubkeys))
          .catch(() => undefined),
      ]);
      const botPubkeys = new Set(
        nextChannels.flatMap((channel) =>
          channel.members.filter((member) => member.role === "bot").map((member) => member.pubkey),
        ),
      );
      setProfiles((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, profile]) => [
            key,
            { ...profile, isAgent: profile.isAgent || botPubkeys.has(key) },
          ]),
        ),
      );
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("error.channelLoad"));
      throw loadError;
    } finally {
      setLoadingChannels(false);
    }
  }, [applyPresenceEvents, client, config.agents, demo, loadProfiles, pubkey]);

  useEffect(() => {
    if (!demo) return;
    const codex = config.agents[0]?.pubkey ?? "1".repeat(64);
    const grok = config.agents[1]?.pubkey ?? "2".repeat(64);
    const general = "11111111-2222-4333-8444-555555555555";
    const direct = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const demoProfiles: Record<string, UserProfile> = {
      ...profileSeed(config, pubkey),
      [pubkey]: { ...fallbackProfile(pubkey, "Alex"), about: "Engineering", isAgent: false },
      [codex]: {
        ...fallbackProfile(codex, "Codex(remote)", true),
        about: "Remote coding and operations assistant",
      },
      [grok]: {
        ...fallbackProfile(grok, "Grok(remote)", true),
        about: "Research and reasoning assistant",
      },
    };
    setProfiles(demoProfiles);
    setChannels([
      {
        id: general,
        name: "general",
        description: "Team collaboration and agent tasks",
        topic: "Build, operate, and learn together",
        type: "stream",
        visibility: "open",
        archived: false,
        members: [
          { pubkey, role: "owner" },
          { pubkey: codex, role: "bot" },
          { pubkey: grok, role: "bot" },
        ],
        participantPubkeys: [pubkey, codex, grok],
      },
      {
        id: direct,
        name: "Codex(remote)",
        description: "",
        topic: null,
        type: "dm",
        visibility: "private",
        archived: false,
        members: [
          { pubkey, role: "owner" },
          { pubkey: codex, role: "bot" },
        ],
        participantPubkeys: [pubkey, codex],
      },
    ]);
    setSelectedChannelId(general);
    const now = Math.floor(Date.now() / 1000);
    const relayPubkey = "3".repeat(64);
    setContentEvents([
      demoSystemEvent(
        "d",
        relayPubkey,
        general,
        { type: "channel_created", actor: pubkey },
        now - 420,
      ),
      demoSystemEvent(
        "e",
        relayPubkey,
        general,
        { type: "member_joined", actor: pubkey, target: codex },
        now - 410,
      ),
      demoSystemEvent(
        "f",
        relayPubkey,
        general,
        { type: "member_joined", actor: pubkey, target: grok },
        now - 400,
      ),
      demoEvent("a", pubkey, general, "@Codex(remote) Check the Relay deployment.", now - 240, [
        ["p", codex],
      ]),
      demoEvent(
        "b",
        codex,
        general,
        "Relay is healthy. Postgres, Redis, MinIO, and Git are available.",
        now - 205,
      ),
      demoEvent("c", pubkey, general, "Document the Web client deployment as well.", now - 80),
    ]);
    setPresence({ [pubkey]: "online", [codex]: "online", [grok]: "away" });
    setLoadingChannels(false);
  }, [config, demo, pubkey]);

  useEffect(() => {
    if (!client || demo) return;
    const unsubscribeState = client.onStateChange(setConnectionState);
    let unsubscribePresence: (() => void) | null = null;
    let cancelled = false;
    const publishPresence = (status: "online" | "away" | "offline") =>
      client.publish({
        kind: 20001,
        content: status,
        tags: [["status", status]],
      });

    void client
      .connect()
      .then(async () => {
        if (cancelled) return;
        await loadChannels();
        unsubscribePresence = await client.subscribe({ kinds: [20001], limit: 0 }, (event) => {
          applyPresenceEvents([event]);
        });
        await publishPresence("online").catch(() => undefined);
        presenceUpdatedAt.current[pubkey.toLowerCase()] = Date.now();
        setPresence((current) => ({ ...current, [pubkey]: "online" }));
      })
      .catch((connectError) => {
        if (!cancelled) {
          setError(connectError instanceof Error ? connectError.message : t("error.relayConnect"));
        }
      });

    const heartbeat = window.setInterval(() => {
      if (client.connectionState === "connected") {
        void publishPresence("online").catch(() => undefined);
        presenceUpdatedAt.current[pubkey.toLowerCase()] = Date.now();
        setPresence((current) => ({ ...current, [pubkey]: "online" }));
      }
    }, 30_000);
    const handleVisibility = () => {
      if (client.connectionState !== "connected") return;
      const status: "away" | "online" = document.hidden ? "away" : "online";
      void publishPresence(status).catch(() => undefined);
      presenceUpdatedAt.current[pubkey.toLowerCase()] = Date.now();
      setPresence((current) => ({ ...current, [pubkey]: status }));
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      unsubscribeState();
      unsubscribePresence?.();
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      client.disconnect();
    };
  }, [applyPresenceEvents, client, demo, loadChannels, pubkey]);

  useEffect(() => {
    if (demo) return;
    const timer = window.setInterval(() => {
      const expiry = Date.now() - 95_000;
      setPresence((current) => {
        let changed = false;
        const next = { ...current };
        for (const [subject, status] of Object.entries(current)) {
          const updatedAt = presenceUpdatedAt.current[subject] ?? 0;
          if (status !== "offline" && updatedAt > 0 && updatedAt < expiry) {
            next[subject] = "offline";
            delete presenceUpdatedAt.current[subject];
            changed = true;
          }
        }
        return changed ? next : current;
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [demo]);

  useEffect(() => {
    if (!client || demo || !selectedChannelId) return;
    let cancelled = false;
    let unsubscribeChannel: (() => void) | null = null;
    let unsubscribeTyping: (() => void) | null = null;
    setLoadingMessages(true);
    setContentEvents([]);
    setAuxiliaryEvents([]);
    const startedAt = Math.floor(Date.now() / 1000) - 2;
    void Promise.all([
      client.query({ kinds: TIMELINE_KINDS, "#h": [selectedChannelId], limit: 150 }),
      client.query({ kinds: [39002], "#d": [selectedChannelId], limit: 1 }),
    ])
      .then(async ([history, memberEvents]) => {
        if (cancelled) return;
        setContentEvents(history);
        const members = memberEvents[0]
          ? memberEvents[0].tags.filter((tag) => tag[0] === "p").map((tag) => tag[1])
          : [];
        await loadProfiles([...members, ...history.flatMap(systemMessagePubkeys)]);
        unsubscribeChannel = await client.subscribe(
          {
            kinds: [...TIMELINE_KINDS, ...AUXILIARY_KINDS],
            "#h": [selectedChannelId],
            since: startedAt,
          },
          (event) => {
            if (TIMELINE_KINDS.includes(event.kind)) {
              setContentEvents((current) => mergeEvents(current, [event]));
              if (event.kind === 40099) void loadProfiles(systemMessagePubkeys(event));
              setDelivery((current) => {
                if (!(event.id in current)) return current;
                const next = { ...current };
                delete next[event.id];
                return next;
              });
            } else {
              setAuxiliaryEvents((current) => mergeEvents(current, [event]));
            }
          },
        );
        unsubscribeTyping = await client.subscribe(
          { kinds: [20002], "#h": [selectedChannelId], since: startedAt, limit: 0 },
          (event) => {
            if (event.pubkey.toLowerCase() === pubkey.toLowerCase()) return;
            setTypingExpiry((current) => ({
              ...current,
              [event.pubkey.toLowerCase()]: Date.now() + 8_000,
            }));
          },
        );
      })
      .catch((loadError) => {
        if (!cancelled)
          setError(loadError instanceof Error ? loadError.message : t("error.messageLoad"));
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
      unsubscribeChannel?.();
      unsubscribeTyping?.();
    };
  }, [client, demo, loadProfiles, pubkey, selectedChannelId]);

  const visibleContentEvents = useMemo(
    () =>
      selectedChannelId
        ? contentEvents.filter((event) => eventChannelId(event) === selectedChannelId)
        : [],
    [contentEvents, selectedChannelId],
  );
  const messageIds = useMemo(
    () => visibleContentEvents.map((event) => event.id).slice(-150),
    [visibleContentEvents],
  );

  useEffect(() => {
    if (!client || demo || !messageIds.length) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const since = Math.floor(Date.now() / 1000) - 2;
    void client
      .query({ kinds: AUXILIARY_KINDS, "#e": messageIds, limit: 10_000 })
      .then((events) => {
        if (!cancelled) setAuxiliaryEvents((current) => mergeEvents(current, events));
      })
      .then(async () => {
        unsubscribe = await client.subscribe(
          { kinds: AUXILIARY_KINDS, "#e": messageIds, since, limit: 0 },
          (event) => setAuxiliaryEvents((current) => mergeEvents(current, [event])),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [client, demo, messageIds]);

  const reactionEventIdsKey = useMemo(() => {
    const visibleIds = new Set(messageIds);
    return auxiliaryEvents
      .filter(
        (event) =>
          event.kind === 7 && visibleIds.has(event.tags.find((tag) => tag[0] === "e")?.[1] ?? ""),
      )
      .map((event) => event.id)
      .sort()
      .join(",");
  }, [auxiliaryEvents, messageIds]);

  useEffect(() => {
    if (!client || demo || !reactionEventIdsKey) return;
    const reactionEventIds = reactionEventIdsKey.split(",");
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const since = Math.floor(Date.now() / 1000) - 2;
    void client
      .query({ kinds: [5, 9005], "#e": reactionEventIds, limit: 10_000 })
      .then((events) => {
        if (!cancelled) setAuxiliaryEvents((current) => mergeEvents(current, events));
      })
      .then(async () => {
        unsubscribe = await client.subscribe(
          { kinds: [5, 9005], "#e": reactionEventIds, since, limit: 0 },
          (event) => setAuxiliaryEvents((current) => mergeEvents(current, [event])),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [client, demo, reactionEventIdsKey]);

  useEffect(() => {
    if (!Object.keys(typingExpiry).length) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTypingExpiry((current) =>
        Object.fromEntries(Object.entries(current).filter(([, expiry]) => expiry > now)),
      );
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [typingExpiry]);

  const messages = useMemo(
    () => buildTimeline(visibleContentEvents, auxiliaryEvents, pubkey.toLowerCase(), delivery),
    [auxiliaryEvents, delivery, pubkey, visibleContentEvents],
  );

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) ?? null;

  const sendMessage = useCallback(
    async (
      content: string,
      attachments: AttachmentDescriptor[],
      replyTarget: ReplyTarget = null,
    ) => {
      if (!selectedChannel || (!content.trim() && !attachments.length)) return;
      const recipients = messageRecipientPubkeys(
        content,
        selectedChannel,
        profiles,
        pubkey,
        replyTarget,
        messages,
      );
      const tags = buildMessageTags(selectedChannel.id, recipients, attachments, replyTarget);
      if (demo) {
        const event = demoEvent(
          crypto.randomUUID().replace(/-/g, ""),
          pubkey,
          selectedChannel.id,
          content,
          Math.floor(Date.now() / 1000),
          tags.slice(1),
        );
        setContentEvents((current) => mergeEvents(current, [event]));
        return;
      }
      if (!client) throw new Error(t("error.relayClient"));
      const event = await signNostrEvent({ kind: 9, content, tags }, { requireActive: true });
      setContentEvents((current) => mergeEvents(current, [event]));
      setDelivery((current) => ({ ...current, [event.id]: "sending" }));
      try {
        await client.publishSigned(event);
        setDelivery((current) => {
          const next = { ...current };
          delete next[event.id];
          return next;
        });
      } catch (publishError) {
        setDelivery((current) => ({ ...current, [event.id]: "failed" }));
        throw publishError;
      }
    },
    [client, demo, messages, profiles, pubkey, selectedChannel],
  );

  const addReaction = useCallback(
    async (message: TimelineMessage, emoji: string) => {
      const pendingKey = `${message.event.id}:${emoji}`;
      if (reactionPending.current.has(pendingKey)) return;
      reactionPending.current.add(pendingKey);
      try {
        const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
        const reactionEventIds = existing?.currentUserEventIds ?? [];

        if (reactionEventIds.length) {
          for (const reactionEventId of reactionEventIds) {
            if (demo) {
              const deletion = demoEvent(
                crypto.randomUUID().replace(/-/g, ""),
                pubkey,
                eventChannelId(message.event),
                "",
                Math.floor(Date.now() / 1000),
                [["e", reactionEventId]],
              );
              deletion.kind = 5;
              setAuxiliaryEvents((current) => mergeEvents(current, [deletion]));
              continue;
            }
            if (!client) throw new Error(t("error.relayClient"));
            const deletion = await signNostrEvent(
              { kind: 5, content: "", tags: [["e", reactionEventId]] },
              { requireActive: true },
            );
            setAuxiliaryEvents((current) => mergeEvents(current, [deletion]));
            try {
              await client.publishSigned(deletion);
            } catch (publishError) {
              setAuxiliaryEvents((current) => current.filter((event) => event.id !== deletion.id));
              throw publishError;
            }
          }
          return;
        }

        if (demo) {
          const event = demoEvent(
            crypto.randomUUID().replace(/-/g, ""),
            pubkey,
            eventChannelId(message.event),
            emoji,
            Math.floor(Date.now() / 1000),
            [["e", message.event.id]],
          );
          event.kind = 7;
          setAuxiliaryEvents((current) => mergeEvents(current, [event]));
          return;
        }
        if (!client) throw new Error(t("error.relayClient"));
        const event = await signNostrEvent(
          { kind: 7, content: emoji, tags: [["e", message.event.id]] },
          { requireActive: true },
        );
        setAuxiliaryEvents((current) => mergeEvents(current, [event]));
        try {
          await client.publishSigned(event);
        } catch (publishError) {
          setAuxiliaryEvents((current) => current.filter((item) => item.id !== event.id));
          throw publishError;
        }
      } finally {
        reactionPending.current.delete(pendingKey);
      }
    },
    [client, demo, pubkey],
  );

  const createChannel = useCallback(
    async (input: CreateChannelInput): Promise<string> => {
      const id = crypto.randomUUID();
      if (demo) {
        setChannels((current) => [
          ...current,
          {
            id,
            name: input.name.trim(),
            description: input.description.trim(),
            topic: null,
            type: input.type,
            visibility: input.visibility,
            archived: false,
            members: [{ pubkey, role: "owner" }],
            participantPubkeys: [pubkey],
          },
        ]);
        setSelectedChannelId(id);
        return id;
      }
      if (!client) throw new Error(t("error.relayClient"));
      const tags: string[][] = [
        ["h", id],
        ["name", input.name.trim()],
        ["visibility", input.visibility],
        ["channel_type", input.type],
      ];
      if (input.description.trim()) tags.push(["about", input.description.trim()]);
      await client.publish({ kind: 9007, content: "", tags });
      await loadChannels();
      setSelectedChannelId(id);
      return id;
    },
    [client, demo, loadChannels, pubkey],
  );

  const openDm = useCallback(
    async (targetPubkey: string): Promise<string> => {
      if (demo) {
        const existing = channels.find(
          (channel) => channel.type === "dm" && channel.participantPubkeys.includes(targetPubkey),
        );
        if (existing) setSelectedChannelId(existing.id);
        return existing?.id ?? "";
      }
      if (!client) throw new Error(t("error.relayClient"));
      const requestedId = crypto.randomUUID();
      const result = await client.publish({
        kind: 41010,
        content: "",
        tags: [
          ["p", targetPubkey],
          ["d", requestedId],
        ],
      });
      let channelId: string = requestedId;
      const responseJson = result.message.startsWith("response:")
        ? result.message.slice("response:".length)
        : "";
      try {
        const response = JSON.parse(responseJson) as { channel_id?: string };
        channelId = response.channel_id || channelId;
      } catch {
        // Older relay versions may not return structured response metadata.
      }
      await loadChannels();
      setSelectedChannelId(channelId);
      return channelId;
    },
    [channels, client, demo, loadChannels],
  );

  const search = useCallback(
    async (term: string): Promise<SearchHit[]> => {
      if (term.trim().length < 2) return [];
      if (demo) {
        return contentEvents
          .filter((event) => event.content.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((event) => ({ event, channelId: eventChannelId(event) }));
      }
      if (!client) return [];
      const events = await client.query({
        kinds: [9, 40002, 40008, 45001, 45003],
        search: term.trim(),
        limit: 50,
      });
      await loadProfiles(events.map((event) => event.pubkey));
      return events
        .map((event) => ({ event, channelId: eventChannelId(event) }))
        .filter((hit) => Boolean(hit.channelId));
    },
    [client, contentEvents, demo, loadProfiles],
  );

  const notifyTyping = useCallback(
    (replyTarget: ReplyTarget = null) => {
      if (demo || !client || !selectedChannelId || Date.now() - typingSentAt.current < 3_000)
        return;
      typingSentAt.current = Date.now();
      const tags: string[][] = [["h", selectedChannelId]];
      if (replyTarget) {
        if (replyTarget.rootId !== replyTarget.id) tags.push(["e", replyTarget.rootId, "", "root"]);
        tags.push(["e", replyTarget.id, "", "reply"]);
      }
      void client.publish({ kind: 20002, content: "", tags }).catch(() => undefined);
    },
    [client, demo, selectedChannelId],
  );

  const state: SessionState = {
    connectionState,
    error,
    channels,
    selectedChannelId,
    messages,
    profiles,
    presence,
    typingPubkeys: Object.keys(typingExpiry),
    communityRole,
    loadingChannels,
    loadingMessages,
  };

  return {
    state,
    selectedChannel,
    selectChannel: setSelectedChannelId,
    sendMessage,
    addReaction,
    createChannel,
    openDm,
    search,
    notifyTyping,
    ensureProfiles: loadProfiles,
    refreshChannels: loadChannels,
  };
}
