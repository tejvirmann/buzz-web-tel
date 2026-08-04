import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { describe, expect, it, vi } from "vitest";
import { mintCommunityInvite } from "@/features/community/invite-api";
import { activateLocalSigner, clearActiveSigner } from "@/shared/lib/nostr-signer";

describe("mintCommunityInvite", () => {
  it("covers the exact POST body with a NIP-98 signature", async () => {
    const secretKey = generateSecretKey();
    const pubkey = getPublicKey(secretKey);
    activateLocalSigner(secretKey);
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            code: "v2.example",
            expires_at: 2_000_000_000,
            url: "https://relay.example.com/invite/v2.example",
            max_uses: 3,
            uses_remaining: 3,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const invite = await mintCommunityInvite("wss://relay.example.com", {
        ttlSecs: 604_800,
        maxUses: 3,
      });
      expect(invite.maxUses).toBe(3);
      const [url, request] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe("https://relay.example.com/api/invites");
      expect(request?.body).toBe('{"ttl_secs":604800,"max_uses":3}');
      const authorization = new Headers(request?.headers).get("Authorization") ?? "";
      expect(authorization).toMatch(/^Nostr /);
      const signed = JSON.parse(atob(authorization.slice("Nostr ".length))) as {
        pubkey: string;
        kind: number;
        tags: string[][];
      };
      expect(signed.pubkey).toBe(pubkey);
      expect(signed.kind).toBe(27235);
      expect(signed.tags).toContainEqual(["u", "https://relay.example.com/api/invites"]);
      expect(signed.tags).toContainEqual(["method", "POST"]);
      expect(signed.tags.find((tag) => tag[0] === "payload")?.[1]).toMatch(/^[0-9a-f]{64}$/);
      expect(signed.tags.find((tag) => tag[0] === "nonce")?.[1]).toBeTruthy();
    } finally {
      clearActiveSigner();
      vi.unstubAllGlobals();
    }
  });
});
