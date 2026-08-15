import { parseRelayFeatures, type RelayFeatureState } from "@/shared/features/relay-features";
import { t } from "@/shared/i18n";

export type ConfiguredAgent = {
  pubkey: string;
  name: string;
  startable?: boolean;
};

export type BrandingConfig = {
  logoUrl: string | null;
  primaryColor: string | null;
};

export type RuntimeConfig = {
  communityName: string;
  relayUrl: string;
  agents: ConfiguredAgent[];
  agentControlUrl: string | null;
  features: RelayFeatureState;
  demoMode: boolean;
  branding: BrandingConfig;
};

function validPubkey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function validHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function parseBranding(raw: unknown): BrandingConfig {
  const branding = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    logoUrl: typeof branding.logoUrl === "string" && branding.logoUrl.trim() ? branding.logoUrl.trim() : null,
    primaryColor: validHexColor(branding.primaryColor) ? branding.primaryColor.trim() : null,
  };
}

/** Converts a #rrggbb hex color to the "H S% L%" triplet format the app's CSS custom properties use. */
function hexToHslTriplet(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Overrides the brand color CSS custom properties on the document root; safe to call repeatedly. */
export function applyBrandColor(primaryColor: string | null): void {
  const root = document.documentElement;
  if (!primaryColor) {
    for (const prop of ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"]) {
      root.style.removeProperty(prop);
    }
    return;
  }
  const triplet = hexToHslTriplet(primaryColor);
  for (const prop of ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"]) {
    root.style.setProperty(prop, triplet);
  }
}

export function normalizeRelayUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(t("error.relayUrlRequired"));
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(t("error.relayUrlInvalid"));
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error(t("error.relayUrlProtocol"));
  }
  return url.toString().replace(/\/$/, "");
}

function normalizeAgentControlUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = new URL(value, window.location.origin);
  const localHttp = url.protocol === "http:" && url.hostname === "localhost";
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(t("error.agentControlUrlProtocol"));
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const configUrl = new URL(
    "config.json",
    new URL(import.meta.env.BASE_URL, window.location.origin),
  );
  const response = await fetch(configUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(t("error.webConfigStatus", { status: response.status }));
  const raw = (await response.json()) as Record<string, unknown>;
  const agents = Array.isArray(raw.agents)
    ? raw.agents
        .filter(
          (agent): agent is Record<string, unknown> =>
            typeof agent === "object" && agent !== null && validPubkey(agent.pubkey),
        )
        .map((agent) => ({
          pubkey: String(agent.pubkey).toLowerCase(),
          name: typeof agent.name === "string" && agent.name.trim() ? agent.name.trim() : "Agent",
          startable: agent.startable === true,
        }))
    : [];

  const branding = parseBranding(raw.branding);
  applyBrandColor(branding.primaryColor);

  return {
    communityName:
      typeof raw.communityName === "string" && raw.communityName.trim()
        ? raw.communityName.trim()
        : "Buzz",
    relayUrl: normalizeRelayUrl(raw.relayUrl),
    agents,
    agentControlUrl: normalizeAgentControlUrl(raw.agentControlUrl),
    features: parseRelayFeatures(raw.features),
    demoMode: raw.demoMode === true && import.meta.env.VITE_ENABLE_DEMO === "true",
    branding,
  };
}

export function relayHttpOrigin(relayUrl: string): string {
  const url = new URL(relayUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
