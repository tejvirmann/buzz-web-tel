import {
  ArrowLeft,
  CircleStop,
  LoaderCircle,
  MessageSquare,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
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

function fallbackProfile(agent: RelayAgent): UserProfile {
  return {
    pubkey: agent.pubkey,
    name: agent.name,
    about: agent.about,
    picture: null,
    isAgent: true,
  };
}

function AgentDetail({
  agent,
  channels,
  profiles,
  relayUrl,
  pendingAction,
  onBack,
  onClose,
  onSetChannel,
  onOpenDm,
}: {
  agent: RelayAgent;
  channels: readonly BuzzChannel[];
  profiles: Readonly<Record<string, UserProfile>>;
  relayUrl: string;
  pendingAction: string | null;
  onBack: () => void;
  onClose: () => void;
  onSetChannel: (agentPubkey: string, channelId: string, shouldJoin: boolean) => Promise<void>;
  onOpenDm: (pubkey: string) => Promise<void>;
}) {
  const assignableChannels = channels.filter((channel) => channel.type !== "dm");
  const profile = { ...(profiles[agent.pubkey] ?? fallbackProfile(agent)), isAgent: true };

  return (
    <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex items-center gap-3">
          <button
            aria-label={t("agents.backToList")}
            className="buzz-icon-button"
            title={t("agents.backToList")}
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">{agent.name}</h2>
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

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex items-start gap-4 border-b pb-7">
              <Avatar
                profile={profile}
                relayUrl={relayUrl}
                size={72}
                showStatus
                status={agent.status}
              />
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-2xl font-semibold">{agent.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    {t("agents.remote")}
                  </span>
                  <span
                    className={`text-xs ${
                      agent.status === "online"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {statusLabel(agent.status)}
                  </span>
                </div>
                {agent.about || agent.agentType ? (
                  <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                    {agent.about || agent.agentType}
                  </p>
                ) : null}
              </div>
              <button
                aria-label={t("agents.message")}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-foreground/5"
                type="button"
                onClick={() => void onOpenDm(agent.pubkey)}
              >
                <MessageSquare className="h-4 w-4" />
                {t("agents.message")}
              </button>
            </div>

            <dl className="grid gap-6 border-b py-7 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("agents.responsePolicy")}
                </dt>
                <dd className="mt-2 flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {responsePolicy(agent)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("field.publicKey")}
                </dt>
                <dd className="mt-2 break-all font-mono text-xs" title={agent.pubkey}>
                  {truncatePubkey(agent.pubkey)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("agents.capabilities")}
                </dt>
                <dd className="mt-2 break-words text-sm">
                  {agent.capabilities.length
                    ? agent.capabilities.join(", ")
                    : t("agents.capabilityDefault")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("agents.channels")}
                </dt>
                <dd className="mt-2 text-sm">
                  {channelCountLabel(manageableChannelCount(agent, channels))}
                </dd>
              </div>
            </dl>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{t("agents.channels")}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">
                {channelCountLabel(manageableChannelCount(agent, channels))}
              </span>
            </div>
            <div className="divide-y rounded-lg border bg-background/25">
              {assignableChannels.map((channel) => {
                const joined = agent.channelIds.includes(channel.id);
                const actionKey = `${agent.pubkey}:${channel.id}`;
                return (
                  <div key={channel.id} className="flex min-h-14 items-center gap-2 px-3 py-2">
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
                      onClick={() => void onSetChannel(agent.pubkey, channel.id, !joined)}
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
      </div>
    </div>
  );
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
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const selected = agents.find((agent) => agent.pubkey === selectedPubkey) ?? null;
  const runningCount = agents.filter((agent) => agent.status !== "offline").length;
  const channelTeams = channels
    .filter((channel) => channel.type !== "dm")
    .map((channel) => ({
      channel,
      agents: agents.filter((agent) => agent.channelIds.includes(channel.id)),
    }))
    .filter((team) => team.agents.length > 0);

  if (selected) {
    return (
      <AgentDetail
        agent={selected}
        channels={channels}
        pendingAction={pendingAction}
        profiles={profiles}
        relayUrl={relayUrl}
        onBack={() => setSelectedPubkey(null)}
        onClose={onClose}
        onOpenDm={onOpenDm}
        onSetChannel={onSetChannel}
      />
    );
  }

  return (
    <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <header className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 pr-10 sm:pr-0">
            <h2 className="text-[26px] font-semibold leading-tight">{t("agents.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("agents.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                aria-expanded={defaultsOpen}
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background/25 px-3 text-xs font-medium hover:bg-foreground/5"
                type="button"
                onClick={() => setDefaultsOpen((open) => !open)}
              >
                <Settings2 className="h-4 w-4" />
                {t("agents.defaults")}
              </button>
              {defaultsOpen ? (
                <div className="absolute right-0 top-11 z-20 w-64 rounded-lg border bg-popover p-4 shadow-lg">
                  <div className="text-xs font-semibold">{t("agents.defaults")}</div>
                  <dl className="mt-3 space-y-3 text-xs">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t("agents.responsePolicy")}</dt>
                      <dd>{t("agents.respondDefault")}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t("field.status")}</dt>
                      <dd>{t("agents.runningCount", { count: runningCount })}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-background/25 px-3 text-xs font-medium disabled:opacity-50"
              disabled
              title={t("agents.remoteStopUnavailable")}
              type="button"
            >
              <CircleStop className="h-4 w-4" />
              {t("agents.stopRunning")}
            </button>
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
              className="buzz-icon-button absolute right-0 top-0 sm:static"
              title={t("agents.close")}
              type="button"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-md bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <section className="mt-9">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {agents.map((agent) => {
              const profile = {
                ...(profiles[agent.pubkey] ?? fallbackProfile(agent)),
                isAgent: true,
              };
              return (
                <article
                  key={agent.pubkey}
                  className="relative flex min-h-[300px] flex-col rounded-lg border bg-background/25 p-4"
                >
                  <button
                    aria-label={t("agents.manage", { name: agent.name })}
                    className="buzz-icon-button absolute right-3 top-3"
                    title={t("agents.manage", { name: agent.name })}
                    type="button"
                    onClick={() => setSelectedPubkey(agent.pubkey)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  <button
                    aria-label={t("agents.manage", { name: agent.name })}
                    className="mx-auto mt-12 flex h-28 w-28 items-center justify-center rounded-full bg-foreground/[0.035]"
                    type="button"
                    onClick={() => setSelectedPubkey(agent.pubkey)}
                  >
                    <Avatar
                      profile={profile}
                      relayUrl={relayUrl}
                      size={104}
                      showStatus
                      status={agent.status}
                    />
                  </button>

                  <button
                    aria-label={t("agents.message")}
                    className="absolute left-1/2 top-[142px] ml-8 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:opacity-90"
                    title={t("agents.message")}
                    type="button"
                    onClick={() => void onOpenDm(agent.pubkey)}
                  >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </button>

                  <div className="mt-auto pt-8">
                    <div className="truncate text-sm font-semibold">{agent.name}</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={
                          agent.status === "online" ? "text-emerald-600 dark:text-emerald-400" : ""
                        }
                      >
                        {statusLabel(agent.status)}
                      </span>
                      <span>·</span>
                      <span className="truncate">{responsePolicy(agent)}</span>
                    </div>
                  </div>
                </article>
              );
            })}

            <button
              aria-label={t("agents.add")}
              className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed text-muted-foreground disabled:opacity-65"
              disabled
              title={t("agents.remoteAddUnavailable")}
              type="button"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>

          {loading && !agents.length ? (
            <div className="flex items-center justify-center px-3 py-16 text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {t("agents.loading")}
            </div>
          ) : null}
          {!loading && !agents.length ? (
            <div className="px-3 py-16 text-center text-sm text-muted-foreground">
              {t("agents.empty")}
            </div>
          ) : null}
        </section>

        <section className="mt-10 pb-8">
          <h3 className="text-xl font-semibold">{t("agents.teams")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("agents.teamsDescription")}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {channelTeams.map(({ channel, agents: teamAgents }) => (
              <div
                key={channel.id}
                className="flex min-h-20 items-center gap-3 rounded-lg border p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.055]">
                  <Users className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">#{channel.name}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {teamAgents.map((agent) => agent.name).join(", ")}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{teamAgents.length}</span>
              </div>
            ))}
            {!channelTeams.length ? (
              <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed px-4 text-sm text-muted-foreground">
                {t("agents.noTeams")}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
