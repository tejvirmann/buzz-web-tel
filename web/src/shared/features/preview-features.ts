import { useCallback, useEffect, useMemo, useState } from "react";
import type { MessageKey } from "@/shared/i18n";

export type PreviewFeatureId = "projects" | "forum";

export type PreviewFeatureState = Record<PreviewFeatureId, boolean>;

export const WEB_PREVIEW_FEATURES: readonly {
  id: PreviewFeatureId;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
}[] = [
  {
    id: "projects",
    nameKey: "preview.projects.name",
    descriptionKey: "preview.projects.description",
  },
  {
    id: "forum",
    nameKey: "preview.forum.name",
    descriptionKey: "preview.forum.description",
  },
];

const STORAGE_KEY = "buzz-feature-overrides-v1";
const DEFAULT_STATE: PreviewFeatureState = { projects: false, forum: false };

function readState(): PreviewFeatureState {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    return {
      projects: value.projects === true,
      forum: value.forum === true,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function usePreviewFeatures() {
  const [enabled, setEnabledState] = useState<PreviewFeatureState>(readState);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setEnabledState(readState());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setEnabled = useCallback((id: PreviewFeatureId, value: boolean) => {
    setEnabledState((current) => {
      const next = { ...current, [id]: value };
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
          string,
          unknown
        >;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, [id]: value }));
      } catch {
        // Browser privacy settings may disable local persistence.
      }
      return next;
    });
  }, []);

  return useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);
}
