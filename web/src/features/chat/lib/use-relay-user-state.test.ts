import { describe, expect, it } from "vitest";
import {
  compactReadContexts,
  mergePreferenceStores,
  mergeReadContexts,
  parsePreferenceStore,
  parseReadContexts,
  parseReadStatePayload,
  readStateCoordinate,
  relayUserStateStorageKey,
  serializeReadContexts,
} from "@/features/chat/lib/use-relay-user-state";
import type { NostrEvent } from "@/shared/api/nostr-types";

describe("Relay-backed user state", () => {
  it("isolates local state by Relay and public key", () => {
    const keys = new Set([
      relayUserStateStorageKey("wss://one.example", "AA"),
      relayUserStateStorageKey("wss://two.example", "AA"),
      relayUserStateStorageKey("wss://one.example", "BB"),
    ]);
    expect(keys.size).toBe(3);
  });

  it("merges favorite and mute tombstones by their last update", () => {
    const local = {
      general: { enabled: true, updatedAt: 10 },
      operations: { enabled: true, updatedAt: 30 },
    };
    const remote = {
      general: { enabled: false, updatedAt: 20 },
      operations: { enabled: false, updatedAt: 25 },
      product: { enabled: true, updatedAt: 40 },
    };

    expect(mergePreferenceStores(local, remote)).toEqual({
      general: { enabled: false, updatedAt: 20 },
      operations: { enabled: true, updatedAt: 30 },
      product: { enabled: true, updatedAt: 40 },
    });
    expect(
      parsePreferenceStore(
        {
          general: { starred: false, updatedAt: 20 },
          malformed: { starred: "yes", updatedAt: 21 },
        },
        "starred",
      ),
    ).toEqual({ general: { enabled: false, updatedAt: 20 } });
  });

  it("merges read positions monotonically and bounds per-message contexts", () => {
    expect(
      mergeReadContexts(
        { general: 20, "msg:old": 10 },
        { general: 15, "msg:old": 30, product: 40 },
      ),
    ).toEqual({ general: 20, "msg:old": 30, product: 40 });

    const contexts: Record<string, number> = { general: 1, product: 2 };
    for (let index = 0; index < 1_005; index += 1) contexts[`msg:${index}`] = index + 10;
    const compacted = compactReadContexts(contexts);
    expect(Object.keys(compacted)).toHaveLength(1_000);
    expect(compacted.general).toBe(1);
    expect(compacted.product).toBe(2);
    expect(compacted["msg:1004"]).toBe(1_014);
    expect(compacted["msg:0"]).toBeUndefined();

    const longContexts = Object.fromEntries(
      Array.from({ length: 500 }, (_, index) => [`channel:${index}:${"x".repeat(220)}`, index + 1]),
    );
    const byteBounded = compactReadContexts(longContexts);
    expect(new TextEncoder().encode(JSON.stringify(byteBounded)).length).toBeLessThanOrEqual(
      32_000,
    );
    expect(Object.keys(byteBounded).length).toBeLessThan(500);
  });

  it("rejects malformed or oversized read contexts", () => {
    expect(
      parseReadContexts({
        general: 20,
        negative: -1,
        fraction: 1.5,
        ["x".repeat(257)]: 30,
      }),
    ).toEqual({ general: 20 });
  });

  it("validates NIP-RS payloads, coordinates, and reserved context escaping", () => {
    expect(
      parseReadStatePayload({
        v: 1,
        client_id: "web-client",
        contexts: { general: 20, "ov_s:general": 1, "esc:ov_s:raw": 30 },
      }),
    ).toEqual({ clientId: "web-client", contexts: { general: 20, "ov_s:raw": 30 } });
    expect(parseReadStatePayload({ v: 2, client_id: "web-client", contexts: {} })).toBeNull();
    expect(parseReadStatePayload({ v: 1, client_id: "界".repeat(22), contexts: {} })).toBeNull();
    expect(
      parseReadStatePayload({
        v: 1,
        client_id: "web-client",
        contexts: Object.fromEntries(
          Array.from({ length: 10_001 }, (_, index) => [`channel:${index}`, index]),
        ),
      }),
    ).toBeNull();
    expect(serializeReadContexts({ "ov_s:raw": 30, "esc:raw": 40, general: 20 })).toEqual({
      "esc:ov_s:raw": 30,
      "esc:esc:raw": 40,
      general: 20,
    });

    const coordinate = `read-state:${"ab".repeat(16)}`;
    const event: NostrEvent = {
      id: "11".repeat(32),
      pubkey: "22".repeat(32),
      kind: 30078,
      content: "ciphertext",
      created_at: 1,
      tags: [
        ["d", coordinate],
        ["t", "read-state"],
      ],
      sig: "33".repeat(64),
    };
    expect(readStateCoordinate(event)).toBe(coordinate);
    expect(
      readStateCoordinate({ ...event, tags: [...event.tags, ["t", "read-state"]] }),
    ).toBeNull();
    expect(
      readStateCoordinate({
        ...event,
        tags: [
          ["d", "read-state:not-hex"],
          ["t", "read-state"],
        ],
      }),
    ).toBeNull();
  });
});
