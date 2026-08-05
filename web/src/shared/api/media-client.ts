import type { AttachmentDescriptor } from "@/features/chat/lib/chat-types";
import { prepareAttachmentUpload } from "@/shared/api/media-sanitizer";
import { relayHttpOrigin } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";
import { signNostrEvent } from "@/shared/lib/nostr-signer";

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function authorizationHeader(
  action: "upload" | "get",
  server: string,
  sha256?: string,
): Promise<string> {
  const expiration = Math.floor(Date.now() / 1000) + 600;
  const tags: string[][] = [
    ["t", action],
    ["expiration", String(expiration)],
    ["server", server],
  ];
  if (sha256) tags.splice(1, 0, ["x", sha256]);
  const event = await signNostrEvent(
    {
      kind: 24242,
      content: action === "upload" ? "Upload file" : "Get media",
      tags,
    },
    { requireActive: true },
  );
  return `Nostr ${base64Url(JSON.stringify(event))}`;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function uploadAttachment(
  file: File,
  relayUrl: string,
): Promise<AttachmentDescriptor> {
  const origin = relayHttpOrigin(relayUrl);
  const { bytes, mimeType } = await prepareAttachmentUpload(file);
  const sha256 = toHex(await crypto.subtle.digest("SHA-256", bytes));
  const server = new URL(origin).host;
  const authorization = await authorizationHeader("upload", server, sha256);
  const response = await fetch(`${origin}/upload`, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": mimeType,
      "X-SHA-256": sha256,
    },
    body: bytes,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(
      `${t("error.mediaUploadStatus", { status: response.status })}${detail ? `: ${detail}` : ""}`,
    );
  }
  const descriptor = (await response.json()) as AttachmentDescriptor;
  return { ...descriptor, filename: file.name };
}

const mediaObjectUrls = new Map<string, Promise<string>>();

export function authenticatedMediaObjectUrl(url: string, relayUrl: string): Promise<string> {
  const cached = mediaObjectUrls.get(url);
  if (cached) return cached;
  const promise = (async () => {
    const relayOrigin = relayHttpOrigin(relayUrl);
    const resolved = new URL(url, relayOrigin);
    if (
      resolved.origin !== new URL(relayOrigin).origin ||
      !resolved.pathname.startsWith("/media/")
    ) {
      return resolved.toString();
    }
    const authorization = await authorizationHeader("get", resolved.host);
    const response = await fetch(resolved, { headers: { Authorization: authorization } });
    if (!response.ok) throw new Error(t("error.mediaLoad", { status: response.status }));
    return URL.createObjectURL(await response.blob());
  })();
  mediaObjectUrls.set(url, promise);
  promise.catch(() => mediaObjectUrls.delete(url));
  return promise;
}

export function clearMediaObjectUrls(): void {
  for (const promise of mediaObjectUrls.values()) {
    void promise.then((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
  }
  mediaObjectUrls.clear();
}
