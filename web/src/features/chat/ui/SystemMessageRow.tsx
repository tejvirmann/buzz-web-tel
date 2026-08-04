import { SmilePlus } from "lucide-react";
import { useState } from "react";
import { describeSystemMessage, fallbackProfile } from "@/features/chat/lib/chat-model";
import type { TimelineMessage, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { getLocale, t } from "@/shared/i18n";

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

export function SystemMessageRow({
  message,
  currentPubkey,
  profiles,
  presence,
  relayUrl,
  onReact,
}: {
  message: TimelineMessage;
  currentPubkey: string;
  profiles: Record<string, UserProfile>;
  presence: Record<string, "online" | "away" | "offline">;
  relayUrl: string;
  onReact: (message: TimelineMessage, emoji: string) => Promise<void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const presentation = describeSystemMessage(message.event, currentPubkey, profiles);
  if (!presentation) return null;

  const identityPubkey = presentation.identityPubkey ?? message.event.pubkey.toLowerCase();
  const profile =
    profiles[identityPubkey] ??
    fallbackProfile(identityPubkey, presentation.identityPubkey ? undefined : t("system.system"));

  return (
    <article
      className="group relative flex gap-3 px-4 py-2.5 hover:bg-foreground/[0.035] sm:px-5"
      data-testid="system-message-row"
    >
      <Avatar
        profile={profile}
        relayUrl={relayUrl}
        size={36}
        showStatus={profile.isAgent}
        status={presence[identityPubkey]}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <strong className="truncate text-sm font-semibold text-foreground">
            {presentation.title}
          </strong>
          {profile.isAgent ? (
            <span className="rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
              Agent
            </span>
          ) : null}
          <time className="shrink-0 text-[11px] text-muted-foreground">
            {formatTime(message.event.created_at)}
          </time>
        </div>
        <p className="mt-0.5 text-sm leading-6 text-foreground">{presentation.action}</p>
        {message.reactions.length ? (
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
          </div>
        ) : null}
      </div>
      <div className="absolute right-4 top-1 hidden items-center rounded-md border bg-popover p-0.5 shadow-sm group-hover:flex group-focus-within:flex">
        <div className="relative">
          <button
            aria-label={t("system.reaction")}
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
                  aria-label={`Reaction ${emoji}`}
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
      </div>
    </article>
  );
}
