import { decode } from "nostr-tools/nip19";
import { t } from "@/shared/i18n";

/**
 * The ONE canonical compact display form for a pubkey: `abcd1234…wxyz`.
 * Mirrors desktop's `@/shared/lib/pubkey`. A truncated pubkey is a
 * recognition aid, never an identity proof — security decisions need the
 * full npub.
 */
export function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 12) {
    return pubkey;
  }
  return `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`;
}

/** Normalize a member identity entered as a hex pubkey or NIP-19 npub. */
export function parsePublicKey(input: string): string {
  const value = input.trim();
  if (/^[0-9a-f]{64}$/i.test(value)) return value.toLowerCase();
  if (value.toLowerCase().startsWith("npub1")) {
    try {
      const decoded = decode(value.toLowerCase());
      if (decoded.type === "npub" && typeof decoded.data === "string") {
        return decoded.data.toLowerCase();
      }
    } catch {
      // Fall through to the shared validation error.
    }
  }
  throw new Error(t("error.pubkeyInvalid"));
}
