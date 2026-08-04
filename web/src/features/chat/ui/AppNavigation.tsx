import {
  Activity,
  Bot,
  GitBranch,
  Hash,
  Inbox,
  Lock,
  MessageCircle,
  MessagesSquare,
  Plus,
  Search,
  Settings,
  Workflow,
  X,
} from "lucide-react";
import buzzAppIcon from "@/assets/app-icon@3x.png";
import { channelDisplayName } from "@/features/chat/lib/chat-model";
import type { BuzzChannel, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { LeftPanelResizeHandle } from "@/features/chat/ui/LeftPanelSizing";
import type { WorkspaceTool } from "@/features/chat/ui/WorkspaceToolPanel";
import { t } from "@/shared/i18n";

function ConnectionDot({ state }: { state: string }) {
  const color =
    state === "connected"
      ? "bg-emerald-500"
      : state === "connecting" || state === "reconnecting"
        ? "bg-amber-500"
        : "bg-rose-500";
  return <span className={`h-2 w-2 rounded-full ${color}`} aria-label={state} role="img" />;
}

function navRow(active: boolean): string {
  return `flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors ${
    active
      ? "bg-foreground/10 font-semibold text-foreground"
      : "text-foreground/85 hover:bg-foreground/5"
  }`;
}

export function AppNavigation({
  communityName,
  relayUrl,
  channels,
  selectedChannelId,
  profiles,
  presence,
  currentPubkey,
  connectionState,
  mobileOpen,
  canCreateChannel,
  canManageMembers,
  activeTool,
  inboxUnreadCount,
  maximumWidth,
  panelWidth,
  onCloseMobile,
  onSelectChannel,
  onCreateChannel,
  onNewDm,
  onSearch,
  onSettings,
  onInvite,
  onShowMessages,
  onToggleTool,
  onResize,
}: {
  communityName: string;
  relayUrl: string;
  channels: BuzzChannel[];
  selectedChannelId: string | null;
  profiles: Record<string, UserProfile>;
  presence: Record<string, "online" | "away" | "offline">;
  currentPubkey: string;
  connectionState: string;
  mobileOpen: boolean;
  canCreateChannel: boolean;
  canManageMembers: boolean;
  activeTool: WorkspaceTool | null;
  inboxUnreadCount: number;
  maximumWidth: number;
  panelWidth: number;
  onCloseMobile: () => void;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  onNewDm: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onInvite: () => void;
  onShowMessages: () => void;
  onToggleTool: (tool: WorkspaceTool) => void;
  onResize: (width: number) => void;
}) {
  const profile = profiles[currentPubkey] ?? {
    pubkey: currentPubkey,
    name: t("system.you"),
    about: "",
    picture: null,
    isAgent: false,
  };
  const streamChannels = channels.filter((channel) => channel.type === "stream");
  const forumChannels = channels.filter((channel) => channel.type === "forum");
  const directMessages = channels.filter((channel) => channel.type === "dm");
  const select = (id: string) => {
    onSelectChannel(id);
    onCloseMobile();
  };

  return (
    <>
      <nav className="hidden w-[52px] shrink-0 flex-col items-center border-r border-black/5 py-3 md:flex dark:border-white/5">
        <img alt="Buzz" className="h-9 w-9 rounded-[9px]" src={buzzAppIcon} />
        <button
          aria-label={canManageMembers ? t("invite.title") : t("nav.newDm")}
          className="mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/65 text-foreground/70 transition-colors hover:bg-background"
          title={canManageMembers ? t("invite.title") : t("nav.newDm")}
          type="button"
          onClick={canManageMembers ? onInvite : onNewDm}
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>
        <div className="mt-auto pb-1">
          <ConnectionDot state={connectionState} />
        </div>
      </nav>

      {mobileOpen ? (
        <button
          aria-label={t("nav.closeChannels")}
          className="fixed inset-0 z-40 bg-black/35 md:hidden"
          type="button"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={`relative z-50 flex shrink-0 flex-col overflow-hidden border-r border-black/5 bg-transparent transition-transform dark:border-white/5 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:!w-[282px] max-md:bg-[linear-gradient(to_bottom,var(--buzz-gradient-top),var(--buzz-gradient-bottom))] max-md:shadow-2xl ${mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"}`}
        style={{ width: panelWidth }}
      >
        <LeftPanelResizeHandle
          label={t("nav.resize")}
          maximum={maximumWidth}
          panelWidth={panelWidth}
          onResize={onResize}
        />

        <header className="flex h-[58px] shrink-0 items-center gap-2 px-2.5">
          <button
            aria-label={t("common.search")}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md bg-background/35 px-3 text-left text-sm text-muted-foreground hover:bg-background/55"
            type="button"
            onClick={onSearch}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t("nav.searchEverything")}</span>
            <kbd className="shrink-0 text-[10px] opacity-65">⌘K</kbd>
          </button>
          <button
            aria-label={t("common.close")}
            className="buzz-icon-button md:!hidden"
            type="button"
            onClick={onCloseMobile}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-5">
          <nav aria-label={t("nav.workspace")} className="space-y-0.5">
            <button
              aria-label={t("inbox.title")}
              aria-pressed={activeTool === "inbox"}
              className={`${navRow(activeTool === "inbox")} relative`}
              type="button"
              onClick={() => onToggleTool("inbox")}
            >
              <Inbox className="h-[17px] w-[17px] shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t("inbox.title")}</span>
              {inboxUnreadCount ? (
                <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold">
                  {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
                </span>
              ) : null}
            </button>
            <button className={navRow(false)} disabled type="button">
              <Activity className="h-[17px] w-[17px] shrink-0" />
              <span>{t("nav.pulse")}</span>
            </button>
            <button
              aria-label={t("nav.projects")}
              aria-pressed={activeTool === "repos"}
              className={navRow(activeTool === "repos")}
              type="button"
              onClick={() => onToggleTool("repos")}
            >
              <GitBranch className="h-[17px] w-[17px] shrink-0" />
              <span>{t("nav.projects")}</span>
            </button>
            <button
              aria-label={t("agents.title")}
              aria-pressed={activeTool === "agents"}
              className={navRow(activeTool === "agents")}
              type="button"
              onClick={() => onToggleTool("agents")}
            >
              <Bot className="h-[17px] w-[17px] shrink-0" />
              <span>{t("agents.title")}</span>
            </button>
            <button className={navRow(false)} disabled type="button">
              <Workflow className="h-[17px] w-[17px] shrink-0" />
              <span>{t("nav.workflows")}</span>
            </button>
          </nav>

          <section className="mt-7">
            <div className="mb-1 flex h-7 items-center justify-between px-3">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t("nav.channels")}
              </span>
              <button
                aria-label={t("dialog.createChannel")}
                className="buzz-icon-button h-6 w-6 flex-none"
                disabled={!canCreateChannel}
                title={canCreateChannel ? t("dialog.createChannel") : t("nav.onlyAdminCreate")}
                type="button"
                onClick={onCreateChannel}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {streamChannels.map((channel) => {
              const selected = activeTool === null && selectedChannelId === channel.id;
              return (
                <button
                  key={channel.id}
                  aria-pressed={selected}
                  className={navRow(selected)}
                  type="button"
                  onClick={() => select(channel.id)}
                >
                  {channel.visibility === "private" ? (
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </section>

          <section className="mt-6">
            <div className="mb-1 flex h-7 items-center px-3 text-[11px] font-medium text-muted-foreground">
              {t("nav.forums")}
            </div>
            {forumChannels.map((channel) => {
              const selected = activeTool === null && selectedChannelId === channel.id;
              return (
                <button
                  key={channel.id}
                  aria-pressed={selected}
                  className={navRow(selected)}
                  type="button"
                  onClick={() => select(channel.id)}
                >
                  <MessagesSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </section>

          <section className="mt-6">
            <div className="mb-1 flex h-7 items-center justify-between px-3">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t("nav.directMessages")}
              </span>
              <button
                aria-label={t("nav.newDm")}
                className="buzz-icon-button h-6 w-6 flex-none"
                title={t("nav.newDm")}
                type="button"
                onClick={onNewDm}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {directMessages.map((channel) => {
              const name = channelDisplayName(channel, profiles, currentPubkey);
              const other = channel.participantPubkeys.find((value) => value !== currentPubkey);
              const dmProfile = other ? profiles[other] : null;
              const selected = activeTool === null && selectedChannelId === channel.id;
              return (
                <button
                  key={channel.id}
                  aria-label={name}
                  aria-pressed={selected}
                  className={navRow(selected)}
                  type="button"
                  onClick={() => select(channel.id)}
                >
                  {dmProfile ? (
                    <Avatar
                      profile={dmProfile}
                      relayUrl={relayUrl}
                      size={23}
                      showStatus
                      status={other ? presence[other] : undefined}
                    />
                  ) : (
                    <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
          </section>
        </div>

        <footer className="shrink-0 px-2 pb-2">
          <button
            aria-label={t("common.settings")}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-foreground/5"
            type="button"
            onClick={onSettings}
          >
            <Avatar profile={profile} relayUrl={relayUrl} size={30} showStatus status="online" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{profile.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                <ConnectionDot state={connectionState} />
                <span className="truncate">{communityName}</span>
              </div>
            </div>
            <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </footer>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t bg-background/95 px-[max(1rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <button
          aria-label={t("inbox.title")}
          aria-pressed={activeTool === "inbox"}
          className="buzz-icon-button relative"
          type="button"
          onClick={() => onToggleTool("inbox")}
        >
          <Inbox className="h-5 w-5" />
          {inboxUnreadCount ? (
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </button>
        <button
          aria-label={t("common.messages")}
          aria-pressed={activeTool === null}
          className="buzz-icon-button"
          type="button"
          onClick={onShowMessages}
        >
          <MessagesSquare className="h-5 w-5" />
        </button>
        <button
          aria-label={t("nav.projects")}
          aria-pressed={activeTool === "repos"}
          className="buzz-icon-button"
          type="button"
          onClick={() => onToggleTool("repos")}
        >
          <GitBranch className="h-5 w-5" />
        </button>
        <button
          aria-label={t("agents.title")}
          aria-pressed={activeTool === "agents"}
          className="buzz-icon-button"
          type="button"
          onClick={() => onToggleTool("agents")}
        >
          <Bot className="h-5 w-5" />
        </button>
        <button
          aria-label={t("common.settings")}
          className="buzz-icon-button"
          type="button"
          onClick={onSettings}
        >
          <Settings className="h-5 w-5" />
        </button>
      </nav>
    </>
  );
}
