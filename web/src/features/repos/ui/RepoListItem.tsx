import { Link } from "@tanstack/react-router";
import { BookMarked } from "lucide-react";
import { t } from "@/shared/i18n";
import { truncatePubkey } from "@/shared/lib/pubkey";
import { relativeTime } from "@/shared/lib/relative-time";
import { Badge } from "@/shared/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { Repo } from "../use-repos";

export function RepoListItem({ repo, preview = false }: { repo: Repo; preview?: boolean }) {
  return (
    <div className="h-full min-h-[136px] rounded-lg border bg-card/65 p-4 text-foreground transition-colors hover:bg-card">
      {/* Row 1: Name + badge */}
      <div className="flex items-center gap-2">
        <BookMarked className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Link
          to="/repos/$repoId"
          params={{ repoId: repo.id }}
          search={preview ? { preview: "repositories" } : undefined}
          className="min-w-0 truncate text-base font-semibold text-foreground underline-offset-4 hover:underline"
        >
          {repo.name}
        </Link>
        <Badge variant="outline" className="ml-auto shrink-0 text-muted-foreground">
          {t("repos.public")}
        </Badge>
      </div>

      {/* Row 2: Description */}
      {repo.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{repo.description}</p>
      )}

      {/* Row 3: Metadata */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default font-mono">{truncatePubkey(repo.owner)}</span>
          </TooltipTrigger>
          <TooltipContent>{repo.owner}</TooltipContent>
        </Tooltip>
        <span>{t("repos.updated", { time: relativeTime(repo.createdAt) })}</span>
      </div>
    </div>
  );
}
