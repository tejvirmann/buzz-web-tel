import { t } from "@/shared/i18n";

export type ConfiguredAgent = {
  pubkey: string;
  name: string;
  startable?: boolean;
};

export type RuntimeConfig = {
  communityName: string;
  relayUrl: string;
  agents: ConfiguredAgent[];
  agentControlUrl: string | null;
  demoMode: boolean;
};

function relayUrlForLocation(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

function validPubkey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function normalizeRelayUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return relayUrlForLocation();
  const url = new URL(value);
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

  return {
    communityName:
      typeof raw.communityName === "string" && raw.communityName.trim()
        ? raw.communityName.trim()
        : "Buzz",
    relayUrl: normalizeRelayUrl(raw.relayUrl),
    agents,
    agentControlUrl: normalizeAgentControlUrl(raw.agentControlUrl),
    demoMode: raw.demoMode === true && import.meta.env.VITE_ENABLE_DEMO === "true",
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
