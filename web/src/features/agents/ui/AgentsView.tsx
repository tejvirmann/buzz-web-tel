import {
  ArrowLeft,
  Bot,
  LoaderCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { RelayAgent } from "@/features/agents/lib/relay-agents";
import type { BuzzChannel, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { t } from "@/shared/i18n";
import { truncatePubkey } from "@/shared/lib/pubkey";

function statusLabel(status: RelayAgent["status"]): string {
  if (status === "online") return t("agents.online");
  if (status === "away") return t("agents.away");
  return t("agents.offline");
}

function responsePolicy(agent: RelayAgent): string {
  if (agent.respondTo === "anyone") return t("agents.respondAnyone");
  if (agent.respondTo === "allowlist") return t("agents.respondAllowlist");
  if (agent.respondTo === "owner-only") return t("agents.respondOwner");
  return t("agents.respondDefault");
}

function manageableChannelCount(agent: RelayAgent, channels: readonly BuzzChannel[]): number {
  return channels.filter(
    (channel) => channel.type !== "dm" && agent.channelIds.includes(channel.id),
  ).length;
}

function channelCountLabel(count: number): string {
  return t(count === 1 ? "agents.channelCountOne" : "agents.channelCount", { count });
}

function agentCountLabel(count: number): string {
  return t(count === 1 ? "agents.countOne" : "agents.count", { count });
}

function fallbackProfile(agent: RelayAgent): UserProfile {
  return {
    pubkey: agent.pubkey,
    name: agent.name,
    about: agent.about,
    picture: null,
    isAgent: true,
  };
}

export function AgentsView({
  agents,
  channels,
  profiles,
  relayUrl,
  loading,
  error,
  pendingAction,
  onClose,
  onRefresh,
  onSetChannel,
  onOpenDm,
}: {
  agents: readonly RelayAgent[];
  channels: readonly BuzzChannel[];
  profiles: Readonly<Record<string, UserProfile>>;
  relayUrl: string;
  loading: boolean;
  error: string | null;
  pendingAction: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onSetChannel: (agentPubkey: string, channelId: string, shouldJoin: boolean) => Promise<void>;
  onOpenDm: (pubkey: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const visibleAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return agents.filter((agent) =>
      normalizedQuery ? agent.name.toLocaleLowerCase().includes(normalizedQuery) : true,
    );
  }, [agents, query]);
  const selected = agents.find((agent) => agent.pubkey === selectedPubkey) ?? null;
  const assignableChannels = channels.filter((channel) => channel.type !== "dm");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b px-3">
        {selected ? (
          <button
            aria-label={t("agents.backToList")}
            className="buzz-icon-button"
            title={t("agents.backToList")}
            type="button"
            onClick={() => setSelectedPubkey(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <Bot className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold">{t("agents.title")}</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {agentCountLabel(agents.length)}
          </p>
        </div>
        <button
          aria-label={t("common.refresh")}
          className="buzz-icon-button"
          disabled={loading}
          title={t("common.refresh")}
          type="button"
          onClick={onRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          aria-label={t("agents.close")}
          className="buzz-icon-button"
          title={t("agents.close")}
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {error ? (
        <div className="border-b bg-destructive/8 px-3 py-2 text-xs text-destructive">{error}</div>
      ) : null}

      {selected ? (
        <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="flex items-start gap-3 border-b pb-5">
            <Avatar
              profile={{
                ...(profiles[selected.pubkey] ?? fallbackProfile(selected)),
                isAgent: true,
              }}
              relayUrl={relayUrl}
              size={48}
              showStatus
              status={selected.status}
            />
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-base font-semibold">{selected.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t("agents.remote")}
                </span>
                <span
                  className={`text-[11px] ${selected.status === "online" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                >
                  {statusLabel(selected.status)}
                </span>
              </div>
              {selected.about || selected.agentType ? (
                <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                  {selected.about || selected.agentType}
                </p>
              ) : null}
            </div>
            <button
              aria-label={t("agents.message")}
              className="buzz-icon-button shrink-0"
              title={t("agents.message")}
              type="button"
              onClick={() => void onOpenDm(selected.pubkey)}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>

          <dl className="space-y-4 border-b py-5 text-sm">
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">
                {t("agents.responsePolicy")}
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                {responsePolicy(selected)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">
                {t("field.publicKey")}
              </dt>
              <dd className="mt-1 break-all font-mono text-xs" title={selected.pubkey}>
                {truncatePubkey(selected.pubkey)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">
                {t("agents.capabilities")}
              </dt>
              <dd className="mt-1 break-words">
                {selected.capabilities.length
                  ? selected.capabilities.join(", ")
                  : t("agents.capabilityDefault")}
              </dd>
            </div>
          </dl>

          <section className="pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{t("agents.channels")}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">
                {channelCountLabel(manageableChannelCount(selected, channels))}
              </span>
            </div>
            <div className="divide-y rounded-md border bg-background/40">
              {assignableChannels.map((channel) => {
                const joined = selected.channelIds.includes(channel.id);
                const actionKey = `${selected.pubkey}:${channel.id}`;
                return (
                  <div key={channel.id} className="flex min-h-12 items-center gap-2 px-3 py-2">
                    <span className="text-muted-foreground">#</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{channel.name}</div>
                      {channel.description ? (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {channel.description}
                        </div>
                      ) : null}
                    </div>
                    <button
                      aria-label={
                        joined
                          ? t("agents.removeFrom", { channel: channel.name })
                          : t("agents.addTo", { channel: channel.name })
                      }
                      className="buzz-icon-button h-7 w-7 flex-none"
                      disabled={pendingAction !== null}
                      title={
                        joined
                          ? t("agents.removeFrom", { channel: channel.name })
                          : t("agents.addTo", { channel: channel.name })
                      }
                      type="button"
                      onClick={() => void onSetChannel(selected.pubkey, channel.id, !joined)}
                    >
                      {pendingAction === actionKey ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : joined ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
              {!assignableChannels.length ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t("agents.noChannels")}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="border-b p-3">
            <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                aria-label={t("agents.search")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder={t("agents.search")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
            {visibleAgents.map((agent) => {
              const profile = profiles[agent.pubkey] ?? fallbackProfile(agent);
              return (
                <button
                  key={agent.pubkey}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-foreground/5"
                  type="button"
                  onClick={() => setSelectedPubkey(agent.pubkey)}
                >
                  <Avatar
                    profile={{ ...profile, isAgent: true }}
                    relayUrl={relayUrl}
                    size={36}
                    showStatus
                    status={agent.status}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{agent.name}</div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className={
                          agent.status === "online" ? "text-emerald-600 dark:text-emerald-400" : ""
                        }
                      >
                        {statusLabel(agent.status)}
                      </span>
                      <span>·</span>
                      <span className="truncate">
                        {channelCountLabel(manageableChannelCount(agent, channels))}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
            {!loading && !visibleAgents.length ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                {t("agents.empty")}
              </p>
            ) : null}
            {loading && !visibleAgents.length ? (
              <div className="flex items-center justify-center px-3 py-10 text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {t("agents.loading")}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
