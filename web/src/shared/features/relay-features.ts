export type RelayFeatureState = {
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
