import {
  AlertCircle,
  CornerUpLeft,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Plus,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { TimelineMessage, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { MessageContent } from "@/features/chat/ui/MessageContent";
import { SystemMessageRow } from "@/features/chat/ui/SystemMessageRow";
import { getLocale, t } from "@/shared/i18n";
import { truncatePubkey } from "@/shared/lib/pubkey";

const QUICK_REACTIONS = ["👍", "❤️", "🎉", "👀", "✅", "🚀"];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1_000);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat(
    getLocale(),
    sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
  ).format(date);
}

export function MessageRow({
  message,
  profile,
  profiles,
  relayUrl,
  presence,
  replyCount = 0,
  showThreadAction = true,
  onOpenThread,
  onReply,
  onReact,
  onEdit,
  onDelete,
  currentPubkey,
  canModerate = false,
}: {
  message: TimelineMessage;
  profile: UserProfile;
  profiles: Record<string, UserProfile>;
  relayUrl: string;
  presence?: "online" | "away" | "offline";
  replyCount?: number;
  showThreadAction?: boolean;
  onOpenThread?: (message: TimelineMessage) => void;
  onReply?: (message: TimelineMessage) => void;
  onReact: (message: TimelineMessage, emoji: string) => Promise<void>;
  onEdit?: (message: TimelineMessage) => void;
  onDelete?: (message: TimelineMessage) => void;
  currentPubkey: string;
  canModerate?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ownMessage = message.event.pubkey.toLowerCase() === currentPubkey.toLowerCase();
  const mentions = useMemo(
    () =>
      message.mentionPubkeys.flatMap((pubkey) => {
        const mentionProfile = profiles[pubkey.toLowerCase()];
        return mentionProfile
          ? [{ pubkey, name: mentionProfile.name, isAgent: mentionProfile.isAgent }]
          : [];
      }),
    [message.mentionPubkeys, profiles],
  );
  return (
    <article
      className="group relative flex gap-3 px-4 py-2.5 hover:bg-foreground/[0.035] sm:px-5"
      data-message-id={message.event.id}
      data-parent-id={message.parentId ?? undefined}
      data-root-id={message.rootId ?? undefined}
      data-deleted={message.deleted || undefined}
    >
      <Avatar
        profile={profile}
        relayUrl={relayUrl}
        size={36}
        showStatus={profile.isAgent}
        status={presence}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <strong className="truncate text-sm font-semibold text-foreground">{profile.name}</strong>
          {profile.isAgent ? (
            <span className="rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
              {t("common.agent")}
            </span>
          ) : null}
          <time className="shrink-0 text-[11px] text-muted-foreground">
            {formatTime(message.event.created_at)}
          </time>
          {message.edited ? (
            <span className="text-[10px] text-muted-foreground">{t("message.edited")}</span>
          ) : null}
          {message.delivery === "sending" ? (
            <LoaderCircle className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : null}
          {message.delivery === "failed" ? (
            <AlertCircle
              className="h-3.5 w-3.5 text-destructive"
              aria-label={t("message.sendFailed")}
            />
          ) : null}
        </div>
        <div className="mt-0.5">
          {message.deleted ? (
            <p className="text-sm italic text-muted-foreground">{t("message.deleted")}</p>
          ) : (
            <MessageContent content={message.content} mentions={mentions} relayUrl={relayUrl} />
          )}
        </div>
        {(!message.deleted && message.reactions.length) || replyCount ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {message.reactions.map((reaction) => (
              <button
                aria-label={t("message.reactionCount", {
                  count: reaction.count,
                  emoji: reaction.emoji,
                })}
                key={reaction.emoji}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs leading-none transition-colors ${reaction.reactedByMe ? "border-primary/35 bg-primary/10" : "border-foreground/10 bg-foreground/[0.045] hover:bg-foreground/[0.075]"}`}
                type="button"
                onClick={() => void onReact(message, reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                <span className="text-[11px] text-muted-foreground">{reaction.count}</span>
              </button>
            ))}
            {showThreadAction && replyCount ? (
              <button
                className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-primary hover:bg-primary/10"
                type="button"
                onClick={() => onOpenThread?.(message)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {t("message.replyCount", { count: replyCount })}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="absolute right-4 top-1 hidden items-center rounded-md border bg-popover p-0.5 shadow-sm group-hover:flex group-focus-within:flex">
        {!message.deleted ? (
          <div className="relative">
            <button
              aria-label={t("message.addReaction")}
              className="buzz-icon-button h-7 w-7 flex-none"
              title={t("message.addReaction")}
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            {pickerOpen ? (
              <div className="absolute right-0 top-8 z-20 flex gap-0.5 rounded-md border bg-popover p-1.5 shadow-lg">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    aria-label={t("message.reaction", { emoji })}
                    className="flex h-8 w-8 items-center justify-center rounded hover:bg-foreground/7"
                    type="button"
                    onClick={() => {
                      setPickerOpen(false);
                      void onReact(message, emoji);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {showThreadAction ? (
          <button
            aria-label={t("message.replyThread")}
            className="buzz-icon-button h-7 w-7 flex-none"
            title={t("message.replyThread")}
            type="button"
            onClick={() => onOpenThread?.(message)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {!message.deleted && onReply ? (
          <button
            aria-label={t("message.replyMessage")}
            className="buzz-icon-button h-7 w-7 flex-none"
            title={t("message.replyMessage")}
            type="button"
            onClick={() => onReply(message)}
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {!message.deleted && ownMessage && onEdit ? (
          <button
            aria-label={t("message.edit")}
            className="buzz-icon-button h-7 w-7 flex-none"
            title={t("message.edit")}
            type="button"
            onClick={() => onEdit(message)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {!message.deleted && (ownMessage || canModerate) && onDelete ? (
          <button
            aria-label={t("message.delete")}
            className="buzz-icon-button h-7 w-7 flex-none text-destructive"
            title={t("message.delete")}
            type="button"
            onClick={() => onDelete(message)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function MessageList({
  messages,
  profiles,
  presence,
  relayUrl,
  currentPubkey,
  loading,
  onOpenThread,
  onReact,
  onEdit,
  onDelete,
  canModerate,
  unreadAfter,
}: {
  messages: TimelineMessage[];
  profiles: Record<string, UserProfile>;
  presence: Record<string, "online" | "away" | "offline">;
  relayUrl: string;
  currentPubkey: string;
  loading: boolean;
  onOpenThread: (message: TimelineMessage) => void;
  onReact: (message: TimelineMessage, emoji: string) => Promise<void>;
  onEdit: (message: TimelineMessage) => void;
  onDelete: (message: TimelineMessage) => void;
  canModerate: boolean;
  unreadAfter: number | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const topLevel = useMemo(() => messages.filter((message) => !message.rootId), [messages]);
  const replyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const message of messages) {
      if (message.rootId) counts[message.rootId] = (counts[message.rootId] ?? 0) + 1;
    }
    return counts;
  }, [messages]);
  const lastMessageId = topLevel[topLevel.length - 1]?.event.id;
  const firstUnreadId = topLevel.find(
    (message) =>
      unreadAfter !== null &&
      message.event.created_at > unreadAfter &&
      message.event.pubkey.toLowerCase() !== currentPubkey.toLowerCase(),
  )?.event.id;

  useEffect(() => {
    if (!lastMessageId) return;
    if (firstUnreadId) unreadRef.current?.scrollIntoView({ block: "center" });
    else bottomRef.current?.scrollIntoView({ block: "end" });
  }, [firstUnreadId, lastMessageId]);

  if (loading && !topLevel.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> {t("message.loading")}
      </div>
    );
  }
  if (!topLevel.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-muted-foreground">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/6">
          <Plus className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">{t("message.startConversation")}</p>
      </div>
    );
  }

  return (
    <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto py-3">
      {topLevel.map((message) => {
        const unreadDivider =
          message.event.id === firstUnreadId ? (
            <div
              ref={unreadRef}
              className="flex items-center gap-3 px-5 py-2"
              data-testid="unread-divider"
            >
              <span className="h-px flex-1 bg-primary/45" />
              <span className="text-[11px] font-semibold text-primary">
                {t("message.newMessages")}
              </span>
              <span className="h-px flex-1 bg-primary/45" />
            </div>
          ) : null;
        if (message.event.kind === 40099 && !message.deleted) {
          return (
            <Fragment key={message.event.id}>
              {unreadDivider}
              <SystemMessageRow
                currentPubkey={currentPubkey}
                message={message}
                presence={presence}
                profiles={profiles}
                relayUrl={relayUrl}
                onReact={onReact}
              />
            </Fragment>
          );
        }
        const pubkey = message.event.pubkey.toLowerCase();
        const profile = profiles[pubkey] ?? {
          pubkey,
          name: truncatePubkey(pubkey),
          about: "",
          picture: null,
          isAgent: false,
        };
        return (
          <Fragment key={message.event.id}>
            {unreadDivider}
            <MessageRow
              canModerate={canModerate}
              currentPubkey={currentPubkey}
              message={message}
              profile={profile}
              profiles={profiles}
              relayUrl={relayUrl}
              presence={presence[pubkey]}
              replyCount={replyCounts[message.event.id] ?? 0}
              onDelete={onDelete}
              onEdit={onEdit}
              onOpenThread={onOpenThread}
              onReact={onReact}
            />
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
