import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  Inbox,
  LoaderCircle,
  Mail,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { BuzzChannel, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { MessageContent } from "@/features/chat/ui/MessageContent";
import type { InboxCategory, InboxItem } from "@/features/inbox/lib/inbox-model";
import { inboxPreview } from "@/features/inbox/lib/inbox-model";
import { getLocale, t } from "@/shared/i18n";
import { truncatePubkey } from "@/shared/lib/pubkey";

type InboxFilter = "all" | InboxCategory;

function categoryLabel(category: InboxCategory): string {
  if (category === "dm") return t("inbox.directMessage");
  if (category === "thread") return t("inbox.threadReply");
  if (category === "needs_action") return t("inbox.needsAction");
  return t("inbox.mention");
}

function relativeTime(createdAt: number): string {
  const seconds = createdAt - Math.floor(Date.now() / 1_000);
  const formatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

export function InboxView({
  items,
  channels,
  profiles,
  relayUrl,
  loading,
  error,
  approvalPending,
  onClose,
  onRefresh,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
  onOpenConversation,
  onRespondToApproval,
}: {
  items: readonly InboxItem[];
  channels: readonly BuzzChannel[];
  profiles: Readonly<Record<string, UserProfile>>;
  relayUrl: string;
  loading: boolean;
  error: string | null;
  approvalPending: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenConversation: (item: InboxItem) => void;
  onRespondToApproval: (item: InboxItem, approved: boolean) => Promise<void>;
}) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) => (filter === "all" || item.category === filter) && (!unreadOnly || item.unread),
      ),
    [filter, items, unreadOnly],
  );
  const selected = selectedId ? (items.find((item) => item.id === selectedId) ?? null) : null;
  const unreadCount = items.filter((item) => item.unread).length;
  const selectedProfile = selected ? profiles[selected.event.pubkey.toLowerCase()] : null;
  const selectedChannel = selected?.channelId
    ? channels.find((channel) => channel.id === selected.channelId)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b px-3">
        {selected ? (
          <button
            aria-label={t("inbox.backToList")}
            className="buzz-icon-button"
            title={t("inbox.backToList")}
            type="button"
            onClick={() => setSelectedId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <Inbox className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold">{t("inbox.title")}</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {t("inbox.unreadCount", { count: unreadCount })}
          </p>
        </div>
        {!selected ? (
          <button
            aria-label={t("inbox.markAllRead")}
            className="buzz-icon-button"
            disabled={!unreadCount}
            title={t("inbox.markAllRead")}
            type="button"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="h-4 w-4" />
          </button>
        ) : null}
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
          aria-label={t("inbox.close")}
          className="buzz-icon-button"
          title={t("inbox.close")}
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
        <article className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <header className="flex items-start gap-3 border-b pb-5">
            <Avatar
              profile={
                selectedProfile ?? {
                  pubkey: selected.event.pubkey,
                  name: truncatePubkey(selected.event.pubkey),
                  about: "",
                  picture: null,
                  isAgent: false,
                }
              }
              relayUrl={relayUrl}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-sm font-semibold">
                {selectedProfile?.name ?? truncatePubkey(selected.event.pubkey)}
              </h3>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span>{categoryLabel(selected.category)}</span>
                {selectedChannel ? <span>#{selectedChannel.name}</span> : null}
                <time>
                  {new Intl.DateTimeFormat(getLocale(), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(selected.event.created_at * 1_000)}
                </time>
              </div>
            </div>
            <button
              aria-label={selected.unread ? t("inbox.markRead") : t("inbox.markUnread")}
              className="buzz-icon-button shrink-0"
              title={selected.unread ? t("inbox.markRead") : t("inbox.markUnread")}
              type="button"
              onClick={() =>
                selected.unread ? onMarkRead(selected.id) : onMarkUnread(selected.id)
              }
            >
              {selected.unread ? (
                <CheckCheck className="h-4 w-4" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </button>
          </header>
          <div className="min-h-32 overflow-hidden py-6 text-sm">
            <MessageContent
              content={selected.event.content || t("inbox.noDetails")}
              relayUrl={relayUrl}
            />
          </div>
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
            {selected.category === "needs_action" ? (
              <>
                <button
                  className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-foreground/5 disabled:opacity-50"
                  disabled={approvalPending !== null}
                  type="button"
                  onClick={() => void onRespondToApproval(selected, false)}
                >
                  {t("inbox.deny")}
                </button>
                <button
                  className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  disabled={approvalPending !== null}
                  type="button"
                  onClick={() => void onRespondToApproval(selected, true)}
                >
                  {approvalPending === selected.id ? (
                    <LoaderCircle className="mr-2 inline h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {t("inbox.approve")}
                </button>
              </>
            ) : null}
            <button
              className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-foreground/5 disabled:opacity-50"
              disabled={!selected.channelId}
              type="button"
              onClick={() => onOpenConversation(selected)}
            >
              {t("inbox.openConversation")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </footer>
        </article>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-foreground/5">
              <input
                checked={unreadOnly}
                className="h-3.5 w-3.5 shrink-0 accent-primary"
                type="checkbox"
                onChange={(event) => setUnreadOnly(event.target.checked)}
              />
              <span className="truncate">{t("inbox.unreadOnly")}</span>
            </label>
            <select
              aria-label={t("inbox.filter")}
              className="h-8 min-w-24 rounded-md border bg-background px-2 text-xs"
              value={filter}
              onChange={(event) => setFilter(event.target.value as InboxFilter)}
            >
              <option value="all">{t("inbox.all")}</option>
              <option value="mention">{t("inbox.mentions")}</option>
              <option value="dm">{t("inbox.directMessages")}</option>
              <option value="thread">{t("inbox.threadReplies")}</option>
              <option value="needs_action">{t("inbox.needsAction")}</option>
            </select>
          </div>
          <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto">
            {visibleItems.map((item) => {
              const profile = profiles[item.event.pubkey.toLowerCase()] ?? {
                pubkey: item.event.pubkey,
                name: truncatePubkey(item.event.pubkey),
                about: "",
                picture: null,
                isAgent: false,
              };
              const channel = item.channelId
                ? channels.find((candidate) => candidate.id === item.channelId)
                : null;
              return (
                <button
                  key={item.id}
                  className="group flex w-full gap-3 border-b px-3 py-3 text-left hover:bg-foreground/5"
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    onMarkRead(item.id);
                  }}
                >
                  <Avatar profile={profile} relayUrl={relayUrl} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${item.unread ? "font-semibold" : "font-medium"}`}
                      >
                        {profile.name}
                      </span>
                      {item.unread ? (
                        <span
                          aria-label={t("inbox.unread")}
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          role="img"
                        />
                      ) : null}
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeTime(item.event.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <span>{categoryLabel(item.category)}</span>
                      {channel ? (
                        <>
                          <span>·</span>
                          <span className="truncate">#{channel.name}</span>
                        </>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1.5 line-clamp-2 text-xs leading-4 ${item.unread ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {inboxPreview(item.event) || t("inbox.noDetails")}
                    </p>
                  </div>
                </button>
              );
            })}
            {!loading && !visibleItems.length ? (
              <div className="px-5 py-14 text-center">
                <Mail className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">{t("inbox.empty")}</p>
              </div>
            ) : null}
            {loading && !visibleItems.length ? (
              <div className="flex items-center justify-center px-5 py-14 text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {t("inbox.loading")}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
