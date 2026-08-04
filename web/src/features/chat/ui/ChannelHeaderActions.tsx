import { Info, Search, UsersRound } from "lucide-react";
import { t } from "@/shared/i18n";

const HEADER_BUTTON =
  "inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-foreground/65 transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:outline-none";

export function ChannelHeaderActions({
  memberCount,
  detailsVisible,
  onSearch,
  onShowDetails,
  onShowMembers,
}: {
  memberCount: number;
  detailsVisible: boolean;
  onSearch: () => void;
  onShowDetails: () => void;
  onShowMembers: () => void;
}) {
  return (
    <fieldset className="flex shrink-0 items-center gap-0.5 border-0 p-0">
      <legend className="sr-only">{t("workspace.channelControls")}</legend>
      <button
        aria-label={t("common.search")}
        className={HEADER_BUTTON}
        title={t("common.search")}
        type="button"
        onClick={onSearch}
      >
        <Search className="h-4 w-4" />
      </button>
      <button
        aria-label={t("workspace.members", { count: memberCount })}
        className={`${HEADER_BUTTON} gap-1`}
        title={t("workspace.members", { count: memberCount })}
        type="button"
        onClick={onShowMembers}
      >
        <UsersRound className="h-4 w-4" />
        <span className="text-[11px] font-medium leading-none">{memberCount}</span>
      </button>
      <button
        aria-label={t("channel.details")}
        aria-pressed={detailsVisible}
        className={HEADER_BUTTON}
        title={t("channel.details")}
        type="button"
        onClick={onShowDetails}
      >
        <Info className="h-4 w-4" />
      </button>
    </fieldset>
  );
}
