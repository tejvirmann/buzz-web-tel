import { nsecEncode } from "nostr-tools/nip19";
import { generateSecretKey, verifyEvent } from "nostr-tools/pure";
import { afterEach, describe, expect, it } from "vitest";
import {
  activateLocalSigner,
  clearActiveSigner,
  createIdentityBackup,
  parseSecretKey,
  restoreIdentityBackup,
  signNostrEvent,
} from "@/shared/lib/nostr-signer";

afterEach(() => clearActiveSigner());

describe("browser Nostr signer", () => {
  it("imports nsec and signs a verifiable event", async () => {
    const secret = generateSecretKey();
    const decoded = parseSecretKey(nsecEncode(secret));
    const pubkey = activateLocalSigner(decoded);
    const signed = await signNostrEvent(
      { kind: 9, content: "hello", tags: [["h", "channel"]] },
      { requireActive: true },
    );

    expect(signed.pubkey).toBe(pubkey);
    expect(verifyEvent(signed)).toBe(true);
  });

  it("rejects malformed private keys", () => {
    expect(() => parseSecretKey("not-a-secret")).toThrow(/nsec/);
    expect(() => parseSecretKey("nsec1malformed")).toThrow(/nsec/);
  });

  it("creates a NIP-49 backup and restores only with the correct passphrase", () => {
    const secret = generateSecretKey();
    const backup = createIdentityBackup(secret, "correct horse battery staple");
    const restored = restoreIdentityBackup(backup, "correct horse battery staple");
    try {
      expect(backup).toMatch(/^ncryptsec1/);
      expect(restored).toEqual(secret);
      expect(() => restoreIdentityBackup(backup, "wrong passphrase")).toThrow();
    } finally {
      secret.fill(0);
      restored.fill(0);
    }
  }, 30_000);
});
