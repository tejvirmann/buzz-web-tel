import { t } from "@/shared/i18n";

const DATABASE_NAME = "buzz-web-identity";
const STORE_NAME = "vault";
const RECORD_KEY = "primary";
const ITERATIONS = 310_000;
const AAD = new TextEncoder().encode("buzz-web-identity-v1");

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export type VaultMetadata = {
  pubkey: string;
  createdAt: number;
};

type VaultRecord = VaultMetadata & {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(t("error.vaultOpen")));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(t("error.vaultOperation")));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error(t("error.vaultTransaction")));
  });
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asArrayBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function readVaultMetadata(): Promise<VaultMetadata | null> {
  const record = await withStore<VaultRecord | undefined>("readonly", (store) =>
    store.get(RECORD_KEY),
  );
  return record ? { pubkey: record.pubkey, createdAt: record.createdAt } : null;
}

export async function saveSecretKey(
  secretKey: Uint8Array,
  pubkey: string,
  passphrase: string,
): Promise<void> {
  if (passphrase.length < 8) throw new Error(t("error.vaultPassphraseLength"));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv), additionalData: asArrayBuffer(AAD) },
    key,
    asArrayBuffer(secretKey),
  );
  const record: VaultRecord = {
    version: 1,
    pubkey,
    createdAt: Date.now(),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  await withStore("readwrite", (store) => store.put(record, RECORD_KEY));
}

export async function unlockSecretKey(passphrase: string): Promise<Uint8Array> {
  const record = await withStore<VaultRecord | undefined>("readonly", (store) =>
    store.get(RECORD_KEY),
  );
  if (!record) throw new Error(t("error.vaultMissing"));
  try {
    const salt = base64ToBytes(record.salt);
    const iv = base64ToBytes(record.iv);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asArrayBuffer(iv), additionalData: asArrayBuffer(AAD) },
      key,
      asArrayBuffer(base64ToBytes(record.ciphertext)),
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error(t("error.vaultBadPassphrase"));
  }
}

export async function deleteVault(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(RECORD_KEY));
}
