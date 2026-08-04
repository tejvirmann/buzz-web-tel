import type { BuzzRelayClient } from "@/shared/api/relay-client";
import { relayHttpOrigin } from "@/shared/config/runtime-config";
import { makeNip98AuthHeader } from "@/shared/lib/nip98";

const INVITE_REQUEST_TIMEOUT_MS = 15_000;

export type MintedInvite = {
  code: string;
  expiresAt: number;
  url: string;
  maxUses: number | null;
  usesRemaining: number | null;
};

export type InviteOptions = {
  ttlSecs: number;
  maxUses: number | null;
};

export async function mintCommunityInvite(
  relayUrl: string,
  options: InviteOptions,
): Promise<MintedInvite> {
  const url = `${relayHttpOrigin(relayUrl)}/api/invites`;
  const payload: Record<string, number> = { ttl_secs: options.ttlSecs };
  if (options.maxUses !== null) payload.max_uses = options.maxUses;
  const body = JSON.stringify(payload);
  const authorization = await makeNip98AuthHeader(url, "POST", { body });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(INVITE_REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof json.error === "string" ? json.error : `HTTP ${response.status}`);
  }
  return {
    code: String(json.code),
    expiresAt: Number(json.expires_at),
    url: String(json.url),
    maxUses: typeof json.max_uses === "number" ? json.max_uses : null,
    usesRemaining: typeof json.uses_remaining === "number" ? json.uses_remaining : null,
  };
}

export async function addCommunityMember(
  client: BuzzRelayClient,
  pubkey: string,
  role: "admin" | "member",
): Promise<void> {
  await client.publish({
    kind: 9030,
    content: "",
    tags: [
      ["p", pubkey.toLowerCase()],
      ["role", role],
    ],
  });
}
