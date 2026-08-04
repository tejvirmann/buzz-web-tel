export type RelayFeatureState = {
  projects: boolean;
  forum: boolean;
};

export type RelayFeatureEvidence = {
  projects: boolean;
  forum: boolean;
};

const DEFAULT_RELAY_FEATURES: RelayFeatureState = {
  projects: false,
  forum: false,
};

export function parseRelayFeatures(value: unknown): RelayFeatureState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_RELAY_FEATURES;
  }
  const features = value as Record<string, unknown>;
  return {
    projects: features.projects === true,
    forum: features.forum === true,
  };
}

/** Never hide Relay content just because its Web deployment flag is stale. */
export function resolveRelayFeatures(
  configured: RelayFeatureState,
  evidence: RelayFeatureEvidence,
): RelayFeatureState {
  return {
    projects: configured.projects || evidence.projects,
    forum: configured.forum || evidence.forum,
  };
}
