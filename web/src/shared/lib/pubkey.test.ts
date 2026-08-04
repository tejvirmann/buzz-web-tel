import { npubEncode } from "nostr-tools/nip19";
import { describe, expect, it } from "vitest";
import { parsePublicKey } from "@/shared/lib/pubkey";

describe("parsePublicKey", () => {
  it("normalizes hexadecimal and npub identities", () => {
    const pubkey = "a".repeat(64);
    expect(parsePublicKey(pubkey.toUpperCase())).toBe(pubkey);
    expect(parsePublicKey(npubEncode(pubkey))).toBe(pubkey);
  });

  it("rejects malformed identities", () => {
    expect(() => parsePublicKey("npub1invalid")).toThrow(/valid npub/i);
  });
});
