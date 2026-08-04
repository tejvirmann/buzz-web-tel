import { t } from "@/shared/i18n";

const DATABASE_NAME = "buzz-web-identity";
const STORE_NAME = "vault";
const LEGACY_RECORD_KEY = "primary";
const ITERATIONS = 310_000;
const LEGACY_AAD = new TextEncoder().encode("buzz-web-identity-v1");

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
  version: 1 | 2;
  salt: string;
  iv: string;
  ciphertext: string;
};

function aadForRecord(record: Pick<VaultRecord, "version" | "pubkey">): Uint8Array {
  return record.version === 1
    ? LEGACY_AAD
    : new TextEncoder().encode(`buzz-web-identity-v2:${record.pubkey.toLowerCase()}`);
}

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
    let result: T;
    let requestCompleted = false;
    let settled = false;
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(error);
    };
    request.onsuccess = () => {
      result = request.result;
      requestCompleted = true;
    };
    request.onerror = () => rejectOnce(request.error ?? new Error(t("error.vaultOperation")));
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      if (requestCompleted) resolve(result);
      else reject(new Error(t("error.vaultOperation")));
    };
    transaction.onerror = () =>
      rejectOnce(transaction.error ?? new Error(t("error.vaultTransaction")));
    transaction.onabort = () =>
      rejectOnce(transaction.error ?? new Error(t("error.vaultTransaction")));
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

async function migrateLegacyRecord(): Promise<void> {
  const record = await withStore<VaultRecord | undefined>("readonly", (store) =>
    store.get(LEGACY_RECORD_KEY),
  );
  if (!record || !/^[0-9a-f]{64}$/i.test(record.pubkey)) return;
  const existing = await withStore<VaultRecord | undefined>("readonly", (store) =>
    store.get(record.pubkey.toLowerCase()),
  );
  if (!existing) {
    await withStore("readwrite", (store) => store.put(record, record.pubkey.toLowerCase()));
  }
  await withStore("readwrite", (store) => store.delete(LEGACY_RECORD_KEY));
}

export async function listVaultMetadata(): Promise<VaultMetadata[]> {
  await migrateLegacyRecord();
  const records = await withStore<VaultRecord[]>("readonly", (store) => store.getAll());
  return records
    .filter((record) => /^[0-9a-f]{64}$/i.test(record.pubkey))
    .map((record) => ({ pubkey: record.pubkey.toLowerCase(), createdAt: record.createdAt }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export async function readVaultMetadata(pubkey?: string): Promise<VaultMetadata | null> {
  const records = await listVaultMetadata();
  return pubkey
    ? (records.find((record) => record.pubkey === pubkey.toLowerCase()) ?? null)
    : (records[0] ?? null);
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
  const normalizedPubkey = pubkey.toLowerCase();
  const recordVersion = 2 as const;
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: asArrayBuffer(iv),
      additionalData: asArrayBuffer(
        aadForRecord({ version: recordVersion, pubkey: normalizedPubkey }),
      ),
    },
    key,
    asArrayBuffer(secretKey),
  );
  const record: VaultRecord = {
    version: recordVersion,
    pubkey: normalizedPubkey,
    createdAt: Date.now(),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  await withStore("readwrite", (store) => store.put(record, normalizedPubkey));
}

export async function unlockSecretKey(pubkey: string, passphrase: string): Promise<Uint8Array> {
  await migrateLegacyRecord();
  const record = await withStore<VaultRecord | undefined>("readonly", (store) =>
    store.get(pubkey.toLowerCase()),
  );
  if (!record) throw new Error(t("error.vaultMissing"));
  try {
    const salt = base64ToBytes(record.salt);
    const iv = base64ToBytes(record.iv);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: asArrayBuffer(iv),
        additionalData: asArrayBuffer(aadForRecord(record)),
      },
      key,
      asArrayBuffer(base64ToBytes(record.ciphertext)),
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error(t("error.vaultBadPassphrase"));
  }
}

export async function deleteVault(pubkey: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(pubkey.toLowerCase()));
}
