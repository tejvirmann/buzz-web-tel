import { useCallback, useEffect, useMemo, useState } from "react";
import { startRelayAgent } from "@/features/agents/agent-control-client";
import { type RelayAgent, relayAgentsFromEvents } from "@/features/agents/lib/relay-agents";
import type { BuzzChannel, UserProfile } from "@/features/chat/lib/chat-types";
import type { NostrEvent } from "@/shared/api/nostr-types";
import type { BuzzRelayClient } from "@/shared/api/relay-client";
import type { ConfiguredAgent } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";

function mergeEvents(current: NostrEvent[], incoming: NostrEvent[]): NostrEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()];
}

export function useRelayAgents({
  client,
  demo,
  agentControlUrl,
  configuredAgents,
  channels,
  profiles,
  presence,
  ensureProfiles,
  refreshChannels,
}: {
  client: BuzzRelayClient | null;
  demo: boolean;
  agentControlUrl: string | null;
  configuredAgents: readonly ConfiguredAgent[];
  channels: readonly BuzzChannel[];
  profiles: Readonly<Record<string, UserProfile>>;
  presence: Readonly<Record<string, RelayAgent["status"]>>;
  ensureProfiles: (pubkeys: string[]) => Promise<void>;
  refreshChannels: () => Promise<void>;
}) {
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [startingPubkey, setStartingPubkey] = useState<string | null>(null);
  const [demoChannelOverrides, setDemoChannelOverrides] = useState<Record<string, string[]>>({});

  const refresh = useCallback(async () => {
    if (!client || demo) return;
    setLoading(true);
    try {
      const nextEvents = await client.query({ kinds: [10100], limit: 500 });
      setEvents(nextEvents);
      await ensureProfiles(nextEvents.map((event) => event.pubkey));
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : t("error.agentsLoad"));
    } finally {
      setLoading(false);
    }
  }, [client, demo, ensureProfiles]);

  useEffect(() => {
    if (!client || demo) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const since = Math.floor(Date.now() / 1000) - 3;
    void refresh();
    void client
      .subscribe({ kinds: [10100], since, limit: 0 }, (event) => {
        setEvents((current) => mergeEvents(current, [event]));
        void ensureProfiles([event.pubkey]);
      })
      .then((stop) => {
        if (cancelled) stop();
        else unsubscribe = stop;
      })
      .catch((subscribeError) => {
        if (!cancelled) {
          setError(
            subscribeError instanceof Error ? subscribeError.message : t("error.agentsLoad"),
          );
        }
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [client, demo, ensureProfiles, refresh]);

  const discoveredAgents = useMemo(
    () =>
      relayAgentsFromEvents({
        events,
        configuredAgents,
        channels,
        profiles,
        presence,
      }),
    [channels, configuredAgents, events, presence, profiles],
  );
  const agents = useMemo(
    () =>
      discoveredAgents.map((agent) => ({
        ...agent,
        channelIds: demoChannelOverrides[agent.pubkey] ?? agent.channelIds,
      })),
    [demoChannelOverrides, discoveredAgents],
  );

  const setAgentChannel = useCallback(
    async (agentPubkey: string, channelId: string, shouldJoin: boolean) => {
      const actionKey = `${agentPubkey}:${channelId}`;
      setPendingAction(actionKey);
      setError(null);
      try {
        if (demo) {
          const currentAgent = agents.find((agent) => agent.pubkey === agentPubkey);
          const currentIds = currentAgent?.channelIds ?? [];
          setDemoChannelOverrides((current) => ({
            ...current,
            [agentPubkey]: shouldJoin
              ? [...new Set([...currentIds, channelId])]
              : currentIds.filter((id) => id !== channelId),
          }));
          return;
        }
        if (!client) throw new Error(t("error.relayClient"));
        await client.publish({
          kind: shouldJoin ? 9000 : 9001,
          content: "",
          tags: [
            ["h", channelId],
            ["p", agentPubkey.toLowerCase()],
            ...(shouldJoin ? [["role", "bot"]] : []),
          ],
        });
        await refreshChannels();
        await refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : t("error.agentUpdate"));
      } finally {
        setPendingAction(null);
      }
    },
    [agents, client, demo, refresh, refreshChannels],
  );

  const startAgent = useCallback(
    async (agentPubkey: string) => {
      const agent = agents.find((candidate) => candidate.pubkey === agentPubkey);
      if (!agentControlUrl || !agent?.startable) {
        setError(t("error.agentStartUnavailable"));
        return;
      }
      setStartingPubkey(agentPubkey);
      setError(null);
      try {
        await startRelayAgent(agentControlUrl, agentPubkey);
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : t("error.agentStart"));
      } finally {
        setStartingPubkey(null);
      }
    },
    [agentControlUrl, agents],
  );

  return {
    agents,
    loading,
    error,
    pendingAction,
    startingPubkey,
    refresh,
    setAgentChannel,
    startAgent,
  };
}
