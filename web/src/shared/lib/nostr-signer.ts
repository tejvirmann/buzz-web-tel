import { decode } from "nostr-tools/nip19";
import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from "nostr-tools/pure";
import { t } from "@/shared/i18n";

export type UnsignedNostrEvent = {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
};

export type SignedNostrEvent = UnsignedNostrEvent & {
  id: string;
  pubkey: string;
  sig: string;
};

type Nip07Provider = {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<SignedNostrEvent>;
};

declare global {
  interface Window {
    nostr?: Nip07Provider;
  }
}

export class Nip07UnavailableError extends Error {
  constructor() {
    super(t("error.nip07Missing"));
    this.name = "Nip07UnavailableError";
  }
}

let activeMode: "nip07" | "local" | null = null;
let activeSecretKey: Uint8Array | null = null;
let activePubkey: string | null = null;
let ephemeralSecretKey: Uint8Array | null = null;

function getEphemeralSecretKey(): Uint8Array {
  ephemeralSecretKey ??= generateSecretKey();
  return ephemeralSecretKey;
}

export function hasNip07Provider(): boolean {
  return typeof window !== "undefined" && window.nostr != null;
}

export async function activateNip07Signer(): Promise<string> {
  if (!window.nostr) throw new Nip07UnavailableError();
  const pubkey = (await window.nostr.getPublicKey()).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pubkey)) {
    throw new Error(t("error.nip07InvalidPubkey"));
  }
  clearActiveSigner();
  activeMode = "nip07";
  activePubkey = pubkey;
  return pubkey;
}

export function activateLocalSigner(secretKey: Uint8Array): string {
  if (secretKey.byteLength !== 32) throw new Error(t("error.secretLength"));
  clearActiveSigner();
  activeSecretKey = new Uint8Array(secretKey);
  activePubkey = getPublicKey(activeSecretKey).toLowerCase();
  activeMode = "local";
  return activePubkey;
}

export function clearActiveSigner(): void {
  activeSecretKey?.fill(0);
  activeSecretKey = null;
  activePubkey = null;
  activeMode = null;
}

export function getActiveSignerPubkey(): string | null {
  return activePubkey;
}

export function getActiveSignerMode(): "nip07" | "local" | null {
  return activeMode;
}

export function parseSecretKey(input: string): Uint8Array {
  const value = input.trim();
  if (/^[0-9a-f]{64}$/i.test(value)) {
    return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  }
  if (value.startsWith("nsec1")) {
    const decoded = decode(value);
    if (decoded.type === "nsec" && decoded.data instanceof Uint8Array) {
      return new Uint8Array(decoded.data);
    }
  }
  throw new Error(t("error.secretInvalid"));
}

function sameUnsignedEvent(expected: UnsignedNostrEvent, actual: SignedNostrEvent): boolean {
  return (
    actual.kind === expected.kind &&
    actual.created_at === expected.created_at &&
    actual.content === expected.content &&
    JSON.stringify(actual.tags) === JSON.stringify(expected.tags)
  );
}

async function signWithNip07(unsigned: UnsignedNostrEvent): Promise<SignedNostrEvent> {
  const provider = window.nostr;
  if (!provider) throw new Nip07UnavailableError();
  const expectedPubkey = (activePubkey ?? (await provider.getPublicKey())).toLowerCase();
  const signed = await provider.signEvent(unsigned);
  if (
    signed.pubkey.toLowerCase() !== expectedPubkey ||
    !sameUnsignedEvent(unsigned, signed) ||
    !verifyEvent(signed)
  ) {
    throw new Error(t("error.nip07InvalidEvent"));
  }
  return signed;
}

export async function signNostrEvent(
  template: Omit<UnsignedNostrEvent, "created_at"> & { created_at?: number },
  options?: { requireNip07?: boolean; requireActive?: boolean },
): Promise<SignedNostrEvent> {
  const unsigned: UnsignedNostrEvent = {
    ...template,
    created_at: template.created_at ?? Math.floor(Date.now() / 1000),
  };

  if (options?.requireNip07 || activeMode === "nip07") return signWithNip07(unsigned);
  if (activeMode === "local" && activeSecretKey) return finalizeEvent(unsigned, activeSecretKey);
  if (options?.requireActive) throw new Error(t("error.signerLocked"));
  if (hasNip07Provider()) return signWithNip07(unsigned);
  return finalizeEvent(unsigned, getEphemeralSecretKey());
}
