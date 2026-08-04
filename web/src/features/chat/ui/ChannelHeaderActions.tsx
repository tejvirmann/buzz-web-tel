import {
  Archive,
  Bell,
  BellOff,
  EllipsisVertical,
  RefreshCw,
  Search,
  Settings,
  Star,
  StarOff,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/shared/i18n";

const HEADER_BUTTON =
  "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-[9px] border border-border/55 bg-background/45 px-2 text-foreground/70 shadow-[0_1px_2px_rgb(0_0_0/3%)] transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export function ChannelHeaderActions({
  loading,
  memberCount,
  membersVisible,
  onRefresh,
  onSearch,
  onSettings,
  onToggleMembers,
  starred,
  muted,
  canArchive,
  onToggleStarred,
  onToggleMuted,
  onArchive,
}: {
  loading: boolean;
  memberCount: number;
  membersVisible: boolean;
  onRefresh: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onToggleMembers: () => void;
  starred: boolean;
  muted: boolean;
  canArchive: boolean;
  onToggleStarred: () => void;
  onToggleMuted: () => void;
  onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <fieldset className="flex shrink-0 items-center gap-2 border-0 p-0">
      <legend className="sr-only">{t("workspace.channelControls")}</legend>
      <button
        aria-label={t("workspace.members", { count: memberCount })}
        aria-pressed={membersVisible}
        className={`${HEADER_BUTTON} gap-1.5 ${membersVisible ? "bg-foreground/[0.065] text-foreground" : ""}`}
        title={t("workspace.members", { count: memberCount })}
        type="button"
        onClick={onToggleMembers}
      >
        <UsersRound className="h-[17px] w-[17px]" />
        <span className="min-w-2 text-[13px] font-medium leading-none">{memberCount}</span>
      </button>
      <div className="relative" ref={menuRef}>
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={t("workspace.channelActions")}
          className={HEADER_BUTTON}
          title={t("workspace.channelActions")}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <EllipsisVertical className="h-[18px] w-[18px]" />
        </button>
        {menuOpen ? (
          <div
            aria-label={t("workspace.channelActions")}
            className="absolute right-0 top-11 z-50 w-44 rounded-lg border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-xl"
            role="menu"
          >
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-foreground/6"
              role="menuitem"
              type="button"
              onClick={() => runMenuAction(onSearch)}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              {t("common.search")}
            </button>
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-foreground/6 disabled:opacity-45"
              disabled={loading}
              role="menuitem"
              type="button"
              onClick={() => runMenuAction(onRefresh)}
            >
              <RefreshCw
                className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
              />
              {t("common.refresh")}
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-foreground/6"
              role="menuitem"
              type="button"
              onClick={() => runMenuAction(onToggleStarred)}
            >
              {starred ? (
                <StarOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Star className="h-4 w-4 text-muted-foreground" />
              )}
              {starred ? t("channel.unstar") : t("channel.star")}
            </button>
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-foreground/6"
              role="menuitem"
              type="button"
              onClick={() => runMenuAction(onToggleMuted)}
            >
              {muted ? (
                <Bell className="h-4 w-4 text-muted-foreground" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              {muted ? t("channel.unmute") : t("channel.mute")}
            </button>
            {canArchive ? (
              <button
                className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-destructive hover:bg-destructive/8"
                role="menuitem"
                type="button"
                onClick={() => runMenuAction(onArchive)}
              >
                <Archive className="h-4 w-4" />
                {t("channel.archive")}
              </button>
            ) : null}
            <div className="my-1 h-px bg-border" />
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-foreground/6"
              role="menuitem"
              type="button"
              onClick={() => runMenuAction(onSettings)}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              {t("common.settings")}
            </button>
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
