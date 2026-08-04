import { makeNip98AuthHeader } from "@/shared/lib/nip98";

const START_TIMEOUT_MS = 20_000;

export async function startRelayAgent(controlUrl: string, pubkey: string): Promise<void> {
  const url = `${controlUrl.replace(/\/$/, "")}/start`;
  const body = JSON.stringify({ pubkey: pubkey.toLowerCase() });
  const authorization = await makeNip98AuthHeader(url, "POST", { body });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(START_TIMEOUT_MS),
  });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof result.error === "string" ? result.error : `HTTP ${response.status}`);
  }
}
