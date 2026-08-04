import type { MemberRole, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { t } from "@/shared/i18n";

export type ComposerMentionCandidate = {
  pubkey: string;
  profile: UserProfile;
  role: MemberRole;
};

export function MentionAutocomplete({
  candidates,
  listId,
  relayUrl,
  selectedIndex,
  onSelect,
}: {
  candidates: ComposerMentionCandidate[];
  listId: string;
  relayUrl: string;
  selectedIndex: number;
  onSelect: (candidate: ComposerMentionCandidate) => void;
}) {
  if (!candidates.length) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-full z-50 mb-1 px-1"
      data-testid="mention-autocomplete"
    >
      <div
        aria-label={t("message.mentionSuggestions")}
        className="buzz-scrollbar max-h-52 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg"
        id={listId}
        role="listbox"
      >
        {candidates.map((candidate, index) => (
          <button
            aria-selected={index === selectedIndex}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${index === selectedIndex ? "bg-foreground/10" : "hover:bg-foreground/6"}`}
            id={`${listId}-${candidate.pubkey}`}
            key={candidate.pubkey}
            role="option"
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(candidate);
            }}
          >
            <Avatar profile={candidate.profile} relayUrl={relayUrl} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{candidate.profile.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {candidate.profile.isAgent ? t("member.remoteAgent") : candidate.role}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
