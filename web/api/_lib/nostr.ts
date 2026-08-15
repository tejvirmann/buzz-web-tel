import { finalizeEvent, verifyEvent } from "nostr-tools/pure";

type SignedNostrEvent = {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  sig: string;
};

/** Server-side NIP-98 HTTP auth signing, using the relay owner's key from an env var. */

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  return Uint8Array.from(clean.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function ownerSignedFetch(
  url: string,
  method: string,
  ownerSecretKey: Uint8Array,
  body?: string,
): Promise<Response> {
  const tags: string[][] = [
    ["u", url],
    ["method", method],
  ];
  if (body !== undefined) {
    tags.push(["payload", await sha256Hex(body)]);
    tags.push(["nonce", crypto.randomUUID()]);
  }
  const event = finalizeEvent(
    { kind: 27235, created_at: Math.floor(Date.now() / 1000), tags, content: "" },
    ownerSecretKey,
  );
  const authorization = `Nostr ${btoa(JSON.stringify(event))}`;
  return fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body,
  });
}

const NIP98_MAX_CLOCK_SKEW_SECONDS = 60;

/**
 * Verifies a NIP-98 Authorization header was signed by the pubkey it claims,
 * for exactly this URL/method, recently. Returns the verified pubkey or null.
 */
export async function verifyNip98(
  authorization: string | null,
  url: string,
  method: string,
): Promise<string | null> {
  if (!authorization?.startsWith("Nostr ")) return null;
  let event: SignedNostrEvent;
  try {
    event = JSON.parse(atob(authorization.slice("Nostr ".length))) as SignedNostrEvent;
  } catch {
    return null;
  }
  if (event.kind !== 27235 || !verifyEvent(event)) return null;
  if (Math.abs(Date.now() / 1000 - event.created_at) > NIP98_MAX_CLOCK_SKEW_SECONDS) return null;
  const taggedUrl = event.tags.find((tag) => tag[0] === "u")?.[1];
  const taggedMethod = event.tags.find((tag) => tag[0] === "method")?.[1];
  if (taggedUrl !== url || taggedMethod?.toUpperCase() !== method.toUpperCase()) return null;
  return event.pubkey.toLowerCase();
}
