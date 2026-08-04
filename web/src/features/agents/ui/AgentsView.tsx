import {
  Bot,
  LoaderCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export function AgentsView({
  agents,
  channels,
  profiles,
  relayUrl,
  loading,
  error,
  pendingAction,
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
  onRefresh: () => void;
  onSetChannel: (agentPubkey: string, channelId: string, shouldJoin: boolean) => Promise<void>;
  onOpenDm: (pubkey: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const visibleAgents = useMemo(
    () =>
      agents.filter((agent) =>
        agent.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    [agents, query],
  );
  const selected =
    visibleAgents.find((agent) => agent.pubkey === selectedPubkey) ?? visibleAgents[0] ?? null;
  useEffect(() => {
    if (selected && selected.pubkey !== selectedPubkey) setSelectedPubkey(selected.pubkey);
  }, [selected, selectedPubkey]);
  const assignableChannels = channels.filter((channel) => channel.type !== "dm");

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={t("agents.title")}>
      <header className="flex h-[60px] shrink-0 items-center gap-3 border-b px-4">
        <Bot className="h-[18px] w-[18px] text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold">{t("agents.title")}</h1>
          <p className="text-[11px] text-muted-foreground">{agentCountLabel(agents.length)}</p>
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
      </header>

      {error ? (
        <div className="border-b bg-destructive/8 px-4 py-2 text-xs text-destructive">{error}</div>
      ) : null}
      <div className="flex min-h-0 flex-1 max-md:flex-col">
        <aside className="flex w-[min(22rem,36%)] min-w-[16rem] shrink-0 flex-col border-r max-md:h-56 max-md:w-full max-md:min-w-0 max-md:border-b max-md:border-r-0">
          <div className="p-3">
            <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                aria-label={t("agents.search")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder={t("agents.search")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {visibleAgents.map((agent) => {
              const profile = profiles[agent.pubkey] ?? {
                pubkey: agent.pubkey,
                name: agent.name,
                about: agent.about,
                picture: null,
                isAgent: true,
              };
              return (
                <button
                  key={agent.pubkey}
                  aria-pressed={selected?.pubkey === agent.pubkey}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-foreground/5 aria-pressed:bg-foreground/10"
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
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className={
                          agent.status === "online" ? "text-emerald-600 dark:text-emerald-400" : ""
                        }
                      >
                        {statusLabel(agent.status)}
                      </span>
                      <span>·</span>
                      <span>{channelCountLabel(manageableChannelCount(agent, channels))}</span>
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
          </div>
        </aside>

        <main className="buzz-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
          {selected ? (
            <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
              <div className="flex items-start gap-4 border-b pb-6">
                <Avatar
                  profile={{
                    ...(profiles[selected.pubkey] ?? {
                      pubkey: selected.pubkey,
                      name: selected.name,
                      about: selected.about,
                      picture: null,
                      isAgent: true,
                    }),
                    isAgent: true,
                  }}
                  relayUrl={relayUrl}
                  size={58}
                  showStatus
                  status={selected.status}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {t("agents.remote")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.about || selected.agentType}
                  </p>
                </div>
                <button
                  className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-foreground/5"
                  type="button"
                  onClick={() => void onOpenDm(selected.pubkey)}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> {t("agents.message")}
                </button>
              </div>

              <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 border-b py-6 text-sm max-sm:grid-cols-1 max-sm:gap-y-1">
                <dt className="text-muted-foreground">{t("field.status")}</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${selected.status === "online" ? "bg-emerald-500" : selected.status === "away" ? "bg-amber-500" : "bg-neutral-400"}`}
                  />
                  {statusLabel(selected.status)}
                </dd>
                <dt className="text-muted-foreground">{t("agents.responsePolicy")}</dt>
                <dd className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  {responsePolicy(selected)}
                </dd>
                <dt className="text-muted-foreground">{t("field.publicKey")}</dt>
                <dd className="font-mono text-xs" title={selected.pubkey}>
                  {truncatePubkey(selected.pubkey)}
                </dd>
                <dt className="text-muted-foreground">{t("agents.capabilities")}</dt>
                <dd>
                  {selected.capabilities.length
                    ? selected.capabilities.join(", ")
                    : t("agents.capabilityDefault")}
                </dd>
              </dl>

              <section className="pt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t("agents.channels")}</h3>
                  <span className="text-xs text-muted-foreground">
                    {channelCountLabel(manageableChannelCount(selected, channels))}
                  </span>
                </div>
                <div className="divide-y rounded-md border bg-background/40">
                  {assignableChannels.map((channel) => {
                    const joined = selected.channelIds.includes(channel.id);
                    const actionKey = `${selected.pubkey}:${channel.id}`;
                    return (
                      <div key={channel.id} className="flex min-h-12 items-center gap-3 px-3 py-2">
                        <span className="text-muted-foreground">#</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{channel.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {channel.description}
                          </div>
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
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {loading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  {t("agents.loading")}
                </>
              ) : (
                t("agents.empty")
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
