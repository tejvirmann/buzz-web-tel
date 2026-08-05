import { generateSecretKey } from "nostr-tools/pure";
import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAttachment } from "@/shared/api/media-client";
import { activateLocalSigner, clearActiveSigner } from "@/shared/lib/nostr-signer";

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("uploadAttachment", () => {
  afterEach(() => {
    clearActiveSigner();
    vi.unstubAllGlobals();
  });

  it("re-encodes a static image before upload so Relay metadata validation accepts it", async () => {
    activateLocalSigner(generateSecretKey());
    const original = new Uint8Array([
      0xff,
      0xd8,
      0xff,
      0xe1,
      0x00,
      0x0a,
      ...new TextEncoder().encode("metadata"),
      0xff,
      0xda,
      0x00,
      0x02,
      0xff,
      0xd9,
    ]);
    const canonical = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1, height: 1, close })),
    );
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (callback: BlobCallback) => callback(new Blob([original], { type: "image/jpeg" })),
      }),
    });

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = new Uint8Array(init?.body as ArrayBuffer);
      if (new TextDecoder().decode(body).includes("metadata")) {
        return new Response(
          '{"error":"media contains metadata or a non-canonical metadata channel"}',
          { status: 422 },
        );
      }
      const sha256 = await sha256Hex(body);
      return new Response(
        JSON.stringify({
          url: `https://relay.example/media/${sha256}.jpg`,
          sha256,
          size: body.byteLength,
          type: new Headers(init?.headers).get("Content-Type"),
          uploaded: 1_800_000_000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const descriptor = await uploadAttachment(
      new File([original], "camera-photo.jpg", { type: "image/jpeg" }),
      "wss://relay.example",
    );

    expect(descriptor).toMatchObject({
      filename: "camera-photo.jpg",
      size: canonical.byteLength,
      type: "image/jpeg",
    });
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(new Uint8Array(request?.body as ArrayBuffer)).toEqual(canonical);
    expect(new Headers(request?.headers).get("X-SHA-256")).toBe(await sha256Hex(canonical));
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps a generic attachment byte-identical", async () => {
    activateLocalSigner(generateSecretKey());
    const original = new TextEncoder().encode("plain attachment body");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = new Uint8Array(init?.body as ArrayBuffer);
      const sha256 = await sha256Hex(body);
      return new Response(
        JSON.stringify({
          url: `https://relay.example/media/${sha256}.bin`,
          sha256,
          size: body.byteLength,
          type: "application/octet-stream",
          uploaded: 1_800_000_000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const descriptor = await uploadAttachment(
      new File([original], "notes.txt", { type: "text/plain" }),
      "wss://relay.example",
    );

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(new Uint8Array(request?.body as ArrayBuffer)).toEqual(original);
    expect(new Headers(request?.headers).get("Content-Type")).toBe("text/plain");
    expect(descriptor.filename).toBe("notes.txt");
  });
});
