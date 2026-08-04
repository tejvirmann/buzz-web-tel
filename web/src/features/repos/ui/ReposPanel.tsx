import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookMarked,
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { mockRepos } from "@/features/repos/mock-repos";
import { type Repo, useRepos } from "@/features/repos/use-repos";
import { getLocale, t } from "@/shared/i18n";
import { truncatePubkey } from "@/shared/lib/pubkey";

type SortOrder = "name" | "newest" | "oldest";

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

function repoCountLabel(count: number): string {
  return t(count === 1 ? "repos.countOne" : "repos.count", { count });
}

function safeWebUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function RepoDetail({
  repo,
  demo,
  onOpenChannel,
}: {
  repo: Repo;
  demo: boolean;
  onOpenChannel: (channelId: string) => void;
}) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const webUrl = safeWebUrl(repo.webUrl);

  const copyCloneUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl((current) => (current === url ? null : current)), 2_000);
    } catch {
      setCopiedUrl(null);
    }
  };

  return (
    <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <div className="border-b pb-5">
        <div className="flex items-start gap-3">
          <BookMarked className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-base font-semibold">{repo.name}</h3>
            <span className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t("repos.public")}
            </span>
          </div>
        </div>
        {repo.description ? (
          <p className="mt-3 break-words text-xs leading-5 text-muted-foreground">
            {repo.description}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("repos.updated", { time: relativeTime(repo.createdAt) })}
        </p>
      </div>

      <dl className="space-y-4 border-b py-5 text-sm">
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">{t("repos.owner")}</dt>
          <dd className="mt-1 font-mono text-xs" title={repo.owner}>
            {truncatePubkey(repo.owner)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">
            {t("repos.contributors")}
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {repo.contributors.length}
          </dd>
        </div>
      </dl>

      {repo.cloneUrls.length ? (
        <section className="border-b py-5">
          <h3 className="mb-3 text-sm font-semibold">{t("repos.clone")}</h3>
          <div className="space-y-2">
            {repo.cloneUrls.map((url) => (
              <div key={url} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-xs" title={url}>
                  {url}
                </code>
                <button
                  aria-label={t("repos.copyClone")}
                  className="buzz-icon-button h-7 w-7 shrink-0"
                  title={t("repos.copyClone")}
                  type="button"
                  onClick={() => void copyCloneUrl(url)}
                >
                  {copiedUrl === url ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-2 pt-5">
        {repo.channelId ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-foreground/5"
            type="button"
            onClick={() => onOpenChannel(repo.channelId as string)}
          >
            <MessageSquare className="h-4 w-4" />
            {t("repos.openChannel")}
          </button>
        ) : null}
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-foreground/5"
          params={{ repoId: repo.id }}
          rel="noopener noreferrer"
          search={demo ? { preview: "repositories" } : undefined}
          target="_blank"
          to="/repos/$repoId"
        >
          <ExternalLink className="h-4 w-4" />
          {t("repos.openFull")}
        </Link>
        {webUrl ? (
          <a
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-foreground/5"
            href={webUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-4 w-4" />
            {t("repos.openWeb")}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function ReposPanel({
  demo,
  onClose,
  onOpenChannel,
}: {
  demo: boolean;
  onClose: () => void;
  onOpenChannel: (channelId: string) => void;
}) {
  const query = useRepos({ enabled: !demo });
  const repos = demo ? mockRepos : (query.data ?? []);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const selected = selectedRepoId
    ? (repos.find((repo) => repo.id === selectedRepoId) ?? null)
    : null;
  const filteredRepos = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const filtered = repos.filter(
      (repo) =>
        !term ||
        repo.name.toLocaleLowerCase().includes(term) ||
        repo.description.toLocaleLowerCase().includes(term),
    );
    return [...filtered].sort((left, right) => {
      if (sort === "oldest") return left.createdAt - right.createdAt;
      if (sort === "name") return left.name.localeCompare(right.name);
      return right.createdAt - left.createdAt;
    });
  }, [repos, search, sort]);

  useEffect(() => {
    if (selectedRepoId && !selected) setSelectedRepoId(null);
  }, [selected, selectedRepoId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b px-3">
        {selected ? (
          <button
            aria-label={t("repos.backToList")}
            className="buzz-icon-button"
            title={t("repos.backToList")}
            type="button"
            onClick={() => setSelectedRepoId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <GitBranch className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold">{t("repos.title")}</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {repoCountLabel(repos.length)}
          </p>
        </div>
        <button
          aria-label={t("common.refresh")}
          className="buzz-icon-button"
          disabled={query.isFetching || demo}
          title={t("common.refresh")}
          type="button"
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
        </button>
        <button
          aria-label={t("repos.close")}
          className="buzz-icon-button"
          title={t("repos.close")}
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {query.error && !demo ? (
        <div className="border-b bg-destructive/8 px-3 py-2 text-xs text-destructive">
          {query.error.message}
        </div>
      ) : null}

      {selected ? (
        <RepoDetail demo={demo} repo={selected} onOpenChannel={onOpenChannel} />
      ) : (
        <>
          <div className="space-y-2 border-b p-3">
            <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                aria-label={t("repos.search")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder={t("repos.search")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              aria-label={t("repos.sort")}
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOrder)}
            >
              <option value="newest">{t("repos.sortNewest")}</option>
              <option value="oldest">{t("repos.sortOldest")}</option>
              <option value="name">{t("repos.sortName")}</option>
            </select>
          </div>
          <div className="buzz-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
            {filteredRepos.map((repo) => (
              <button
                key={`${repo.owner}:${repo.id}`}
                className="w-full rounded-md px-3 py-3 text-left hover:bg-foreground/5"
                type="button"
                onClick={() => setSelectedRepoId(repo.id)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <BookMarked className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{repo.name}</span>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {t("repos.public")}
                  </span>
                </div>
                {repo.description ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
                    {repo.description}
                  </p>
                ) : null}
                <div className="mt-2 flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="truncate font-mono">{truncatePubkey(repo.owner)}</span>
                  <span>·</span>
                  <span className="shrink-0">{relativeTime(repo.createdAt)}</span>
                </div>
              </button>
            ))}
            {query.isLoading && !demo ? (
              <div className="flex items-center justify-center px-4 py-14 text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {t("repos.loading")}
              </div>
            ) : null}
            {!query.isLoading && repos.length > 0 && !filteredRepos.length ? (
              <div className="px-4 py-14 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">{t("repos.noMatches")}</p>
              </div>
            ) : null}
            {!query.isLoading && !repos.length ? (
              <div className="px-4 py-14 text-center">
                <BookMarked className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">{t("repos.empty")}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("repos.emptyDescription")}
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
