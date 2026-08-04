/**
 * Shared resolver for the `(owner, repoName, defaultRef)` triple every
 * repo-scoped page needs. Combines the NIP-34 announcement (`useRepo`) with
 * the refs query (`useRepoRefs`) so callers don't duplicate that wiring.
 *
 * `defaultRef` falls back to `"main"` until refs load, matching the
 * pre-existing behaviour in `RepoDetailPage`.
 */

import { useRepoRefs } from "./use-repo-refs";
import { useRepo } from "./use-repos";

export interface RepoContext {
  owner: string;
  repoName: string;
  defaultRef: string;
  isLoading: boolean;
  error: Error | null;
}

export function useRepoContext(
  repoId: string,
  { relayUrl, preview = false }: { relayUrl: string; preview?: boolean },
): RepoContext {
  const {
    data: repo,
    isLoading: repoLoading,
    error: repoError,
  } = useRepo(repoId, {
    relayUrl,
    preview,
  });
  const { data: refs, isLoading: refsLoading } = useRepoRefs(repoId, {
    relayUrl,
    preview,
  });

  return {
    owner: repo?.owner ?? "",
    repoName: repo?.id ?? "",
    defaultRef: refs?.head?.ref ?? "main",
    isLoading: repoLoading || refsLoading,
    error: (repoError as Error | null) ?? null,
  };
}
