import { useState } from "react";
import { t } from "@/shared/i18n";
import type { CommitInfo, ReadmeResult, TreeEntry } from "../git-client";
import { RepoCommitsSection } from "./RepoCommitsSection";
import { RepoReadmeSection } from "./RepoReadmeSection";
import { RepoTreeSection } from "./RepoTreeSection";

type Tab = "code" | "commits";

export function RepoContentTabs({
  repoId,
  treeEntries,
  treeLoading,
  commits,
  commitsLoading,
  readme,
  readmeLoading,
  preview,
}: {
  repoId: string;
  treeEntries: TreeEntry[] | undefined;
  treeLoading: boolean;
  commits: CommitInfo[] | undefined;
  commitsLoading: boolean;
  readme: ReadmeResult | null | undefined;
  readmeLoading: boolean;
  preview: boolean;
}) {
  const [tab, setTab] = useState<Tab>("code");

  return (
    <div className="mt-6">
      <div aria-label={t("repos.contents")} className="flex gap-1 border-b" role="tablist">
        <button
          aria-selected={tab === "code"}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "code"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          role="tab"
          type="button"
          onClick={() => setTab("code")}
        >
          {t("repos.code")}
        </button>
        <button
          aria-selected={tab === "commits"}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "commits"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          role="tab"
          type="button"
          onClick={() => setTab("commits")}
        >
          {t("repos.commits")}
        </button>
      </div>

      {tab === "code" ? (
        <div role="tabpanel">
          <RepoTreeSection
            entries={treeEntries}
            isLoading={treeLoading}
            repoId={repoId}
            preview={preview}
          />
          <RepoReadmeSection readme={readme} isLoading={readmeLoading} />
        </div>
      ) : (
        <div role="tabpanel">
          <RepoCommitsSection commits={commits} isLoading={commitsLoading} />
        </div>
      )}
    </div>
  );
}
