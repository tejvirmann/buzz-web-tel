import {
  Archive,
  Bell,
  BellOff,
  Hash,
  Lock,
  RefreshCw,
  Star,
  StarOff,
  UsersRound,
  X,
} from "lucide-react";
import type { BuzzChannel } from "@/features/chat/lib/chat-types";
import { t } from "@/shared/i18n";
import { RightPanelResizeHandle } from "@/shared/ui/right-panel-sizing";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 max-w-[65%] break-words text-right text-xs">{value}</dd>
    </div>
  );
}

export function ChannelDetailsPanel({
  channel,
  loading,
  starred,
  muted,
  canArchive,
  maximumWidth,
  minimumWidth,
  panelWidth,
  onArchive,
  onClose,
  onRefresh,
  onResize,
  onToggleMuted,
  onToggleStarred,
}: {
  channel: BuzzChannel;
  loading: boolean;
  starred: boolean;
  muted: boolean;
  canArchive: boolean;
  maximumWidth: number;
  minimumWidth: number;
  panelWidth: number;
  onArchive: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onResize: (width: number) => void;
  onToggleMuted: () => void;
  onToggleStarred: () => void;
}) {
  return (
    <aside
      aria-label={t("channel.details")}
      className="relative flex min-h-0 shrink-0 flex-col border-l bg-background/96 max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:z-30 max-xl:shadow-xl max-sm:!w-full"
      style={{ width: panelWidth }}
    >
      <RightPanelResizeHandle
        label={t("channel.resizeDetails")}
        maximum={maximumWidth}
        minimum={minimumWidth}
        panelWidth={panelWidth}
        onResize={onResize}
      />
      <header className="flex h-11 shrink-0 items-center justify-between border-b px-3">
        <h2 className="truncate text-[13px] font-semibold">{t("channel.details")}</h2>
        <button
          aria-label={t("channel.closeDetails")}
          className="buzz-icon-button h-7 w-7 flex-none"
          title={t("channel.closeDetails")}
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground/6 text-muted-foreground">
          {channel.visibility === "private" ? (
            <Lock className="h-5 w-5" />
          ) : (
            <Hash className="h-5 w-5" />
          )}
        </div>
        <h3 className="mt-3 break-words text-lg font-semibold">{channel.name}</h3>
        {channel.description ? (
          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
            {channel.description}
          </p>
        ) : null}

        <dl className="mt-5 border-y">
          {channel.topic ? <DetailRow label={t("channel.topic")} value={channel.topic} /> : null}
          <DetailRow
            label={t("dialog.channelType")}
            value={
              channel.type === "forum"
                ? t("dialog.channelTypeForum")
                : t("dialog.channelTypeStream")
            }
          />
          <DetailRow
            label={t("dialog.channelVisibility")}
            value={
              channel.visibility === "private"
                ? t("dialog.visibilityPrivate")
                : t("dialog.visibilityOpen")
            }
          />
          <DetailRow
            label={t("member.count", { count: channel.members.length })}
            value={
              <span className="inline-flex items-center gap-1">
                <UsersRound className="h-3.5 w-3.5" /> {channel.members.length}
              </span>
            }
          />
        </dl>

        <div className="mt-5 space-y-1">
          <button
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm hover:bg-foreground/5"
            type="button"
            onClick={onToggleStarred}
          >
            {starred ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
            {starred ? t("channel.unstar") : t("channel.star")}
          </button>
          <button
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm hover:bg-foreground/5"
            type="button"
            onClick={onToggleMuted}
          >
            {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {muted ? t("channel.unmute") : t("channel.mute")}
          </button>
          <button
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm hover:bg-foreground/5 disabled:opacity-40"
            disabled={loading}
            type="button"
            onClick={onRefresh}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </button>
          {canArchive ? (
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-destructive hover:bg-destructive/8"
              type="button"
              onClick={onArchive}
            >
              <Archive className="h-4 w-4" />
              {t("channel.archive")}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
