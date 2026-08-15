import { unlockSecretKey } from "@/shared/lib/identity-vault";
import { activateLocalSigner } from "@/shared/lib/nostr-signer";

/**
 * Lets an identity created through the hidden-key join flow stay signed in
 * across reloads without ever prompting for a passphrase, mirroring how
 * Slack keeps you logged in on a device. The vault entry is still
 * passphrase-encrypted (see identity-vault.ts); this just also stashes that
 * passphrase in localStorage so it can be replayed automatically.
 */

const STORAGE_KEY = "buzz-auto-unlock";

type AutoUnlockRecord = { pubkey: string; passphrase: string };

export function generateAutoPassphrase(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes));
}

export function rememberAutoUnlock(pubkey: string, passphrase: string): void {
  const record: AutoUnlockRecord = { pubkey: pubkey.toLowerCase(), passphrase };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function forgetAutoUnlock(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Attempts to silently restore the active signer; returns the pubkey on success. */
export async function tryAutoUnlock(): Promise<string | null> {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  let record: AutoUnlockRecord;
  try {
    record = JSON.parse(raw) as AutoUnlockRecord;
  } catch {
    forgetAutoUnlock();
    return null;
  }
  try {
    const secret = await unlockSecretKey(record.pubkey, record.passphrase);
    try {
      return activateLocalSigner(secret);
    } finally {
      secret.fill(0);
    }
  } catch {
    forgetAutoUnlock();
    return null;
  }
}
