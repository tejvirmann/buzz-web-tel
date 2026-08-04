import { AtSign, MessageCircle, X } from "lucide-react";
import type { BuzzChannel, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { RightPanelResizeHandle } from "@/features/chat/ui/RightPanelSizing";
import { t } from "@/shared/i18n";

export function MemberPanel({
  channel,
  profiles,
  presence,
  relayUrl,
  currentPubkey,
  maximumWidth,
  minimumWidth,
  panelWidth,
  onClose,
  onMention,
  onOpenDm,
  onResize,
}: {
  channel: BuzzChannel;
  profiles: Record<string, UserProfile>;
  presence: Record<string, "online" | "away" | "offline">;
  relayUrl: string;
  currentPubkey: string;
  maximumWidth: number;
  minimumWidth: number;
  panelWidth: number;
  onClose: () => void;
  onMention: (name: string) => void;
  onOpenDm: (pubkey: string) => Promise<void>;
  onResize: (width: number) => void;
}) {
  const members = channel.members
    .map((member) => ({ member, profile: profiles[member.pubkey] }))
    .filter((entry): entry is { member: (typeof channel.members)[number]; profile: UserProfile } =>
      Boolean(entry.profile),
    )
    .sort(
      (left, right) =>
        Number(right.profile.isAgent) - Number(left.profile.isAgent) ||
        left.profile.name.localeCompare(right.profile.name),
    );
  return (
    <aside
      className="relative flex min-h-0 shrink-0 flex-col overflow-hidden border-l bg-background/95 backdrop-blur-xl 2xl:bg-background/35 2xl:backdrop-blur-none max-2xl:absolute max-2xl:inset-y-0 max-2xl:right-0 max-2xl:z-30 max-2xl:shadow-xl max-sm:!w-full"
      style={{ width: panelWidth }}
    >
      <RightPanelResizeHandle
        label={t("member.resize")}
        maximum={maximumWidth}
        minimum={minimumWidth}
        panelWidth={panelWidth}
        onResize={onResize}
      />
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 2xl:hidden">
        <h2 className="text-sm font-semibold">{t("member.count", { count: members.length })}</h2>
        <button
          aria-label={t("member.close")}
          className="buzz-icon-button"
          title={t("member.close")}
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase text-muted-foreground max-2xl:hidden">
          {t("member.count", { count: members.length })}
        </div>
        <div className="px-2 max-2xl:pt-2">
          {members.map(({ member, profile }) => (
            <div
              key={member.pubkey}
              className="group flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-foreground/5"
            >
              <Avatar
                profile={profile}
                relayUrl={relayUrl}
                size={30}
                showStatus
                status={presence[member.pubkey]}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{profile.name}</div>
                <div className="text-[10px] capitalize text-muted-foreground">
                  {profile.isAgent ? t("member.remoteAgent") : member.role}
                </div>
              </div>
              {member.pubkey !== currentPubkey ? (
                <div className="hidden items-center group-hover:flex group-focus-within:flex">
                  {channel.type !== "dm" ? (
                    <button
                      aria-label={`@${profile.name}`}
                      className="buzz-icon-button h-7 w-7 flex-none"
                      title={`@${profile.name}`}
                      type="button"
                      onClick={() => onMention(profile.name)}
                    >
                      <AtSign className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    aria-label={t("member.directMessage", { name: profile.name })}
                    className="buzz-icon-button h-7 w-7 flex-none"
                    title={t("member.directMessage", { name: profile.name })}
                    type="button"
                    onClick={() => void onOpenDm(member.pubkey)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
