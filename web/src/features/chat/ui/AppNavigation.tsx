import { Link } from "@tanstack/react-router";
import {
  GitBranch,
  Hash,
  MessageCircle,
  MessagesSquare,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import buzzAppIcon from "@/assets/app-icon@3x.png";
import { channelDisplayName } from "@/features/chat/lib/chat-model";
import type { BuzzChannel, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { LeftPanelResizeHandle } from "@/features/chat/ui/LeftPanelSizing";
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
  maximumWidth,
  panelWidth,
  onCloseMobile,
  onSelectChannel,
  onCreateChannel,
  onNewDm,
  onSearch,
  onSettings,
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
  maximumWidth: number;
  panelWidth: number;
  onCloseMobile: () => void;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  onNewDm: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onResize: (width: number) => void;
}) {
  const profile = profiles[currentPubkey] ?? {
    pubkey: currentPubkey,
    name: t("system.you"),
    about: "",
    picture: null,
    isAgent: false,
  };
  const streamChannels = channels.filter((channel) => channel.type !== "dm");
  const directMessages = channels.filter((channel) => channel.type === "dm");
  const select = (id: string) => {
    onSelectChannel(id);
    onCloseMobile();
  };

  return (
    <>
      <nav className="hidden w-[60px] shrink-0 flex-col items-center border-r border-black/5 py-3 md:flex dark:border-white/5">
        <img alt="Buzz" className="h-9 w-9 rounded-[9px]" src={buzzAppIcon} />
        <div className="mt-6 flex flex-col gap-1">
          <button
            aria-label={t("common.messages")}
            aria-pressed="true"
            className="buzz-icon-button"
            title={t("common.messages")}
            type="button"
          >
            <MessagesSquare className="h-[18px] w-[18px]" />
          </button>
          <Link
            aria-label={t("nav.projects")}
            className="buzz-icon-button"
            to="/repos"
            title={t("nav.projects")}
          >
            <GitBranch className="h-[18px] w-[18px]" />
          </Link>
          <button
            aria-label={t("common.search")}
            className="buzz-icon-button"
            title={t("common.search")}
            type="button"
            onClick={onSearch}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            aria-label={t("common.settings")}
            className="buzz-icon-button"
            title={t("common.settings")}
            type="button"
            onClick={onSettings}
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <Avatar profile={profile} relayUrl={relayUrl} size={30} />
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
        className={`buzz-scrollbar relative z-50 flex shrink-0 flex-col overflow-y-auto border-r border-black/5 bg-transparent transition-transform dark:border-white/5 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:!w-[282px] max-md:bg-[linear-gradient(to_bottom,var(--buzz-gradient-top),var(--buzz-gradient-bottom))] max-md:shadow-2xl ${mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"}`}
        style={{ width: panelWidth }}
      >
        <LeftPanelResizeHandle
          label={t("nav.resize")}
          maximum={maximumWidth}
          panelWidth={panelWidth}
          onResize={onResize}
        />
        <header className="flex h-14 shrink-0 items-center gap-2 px-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{communityName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ConnectionDot state={connectionState} />{" "}
              {connectionState === "connected" ? t("nav.relayOnline") : t("nav.connecting")}
            </div>
          </div>
          <button
            aria-label={t("common.close")}
            className="buzz-icon-button md:!hidden"
            type="button"
            onClick={onCloseMobile}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-2 pb-5">
          <div className="mb-1 mt-3 flex h-7 items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
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
          {streamChannels.map((channel) => (
            <button
              key={channel.id}
              aria-pressed={selectedChannelId === channel.id}
              className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm ${selectedChannelId === channel.id ? "bg-foreground/10 font-medium text-foreground" : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"}`}
              type="button"
              onClick={() => select(channel.id)}
            >
              <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}

          <div className="mb-1 mt-5 flex h-7 items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
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
            return (
              <button
                key={channel.id}
                aria-label={name}
                aria-pressed={selectedChannelId === channel.id}
                className={`flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm ${selectedChannelId === channel.id ? "bg-foreground/10 font-medium text-foreground" : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"}`}
                type="button"
                onClick={() => select(channel.id)}
              >
                {dmProfile ? (
                  <Avatar
                    profile={dmProfile}
                    relayUrl={relayUrl}
                    size={22}
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
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t bg-background/95 px-[max(1rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <button
          aria-label={t("common.messages")}
          className="buzz-icon-button"
          type="button"
          onClick={onCloseMobile}
        >
          <MessagesSquare className="h-5 w-5" />
        </button>
        <Link aria-label={t("nav.projects")} className="buzz-icon-button" to="/repos">
          <GitBranch className="h-5 w-5" />
        </Link>
        <button
          aria-label={t("common.search")}
          className="buzz-icon-button"
          type="button"
          onClick={onSearch}
        >
          <Search className="h-5 w-5" />
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
