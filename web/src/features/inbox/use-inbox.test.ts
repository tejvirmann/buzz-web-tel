import { describe, expect, it } from "vitest";
import { eventReadFrontier, topLevelChannelEvents } from "@/features/inbox/use-inbox";
import type { NostrEvent } from "@/shared/api/nostr-types";

function event(id: string, createdAt: number, tags: string[][]): NostrEvent {
  return {
    id: id.repeat(64).slice(0, 64),
    pubkey: "11".repeat(32),
    kind: 9,
    content: id,
    created_at: createdAt,
    tags: [["h", "general"], ...tags],
    sig: "22".repeat(64),
  };
}

describe("Inbox channel read frontier", () => {
  it("does not advance the channel frontier from thread replies", () => {
    const root = event("a", 10, []);
    const reply = event("b", 20, [["e", root.id, "", "reply"]]);
    const nested = event("c", 30, [
      ["e", root.id, "", "root"],
      ["e", reply.id, "", "reply"],
    ]);

    expect(topLevelChannelEvents([root, reply, nested], "general")).toEqual([root]);
  });

  it("uses channel, thread, and per-message read frontiers hierarchically", () => {
    const reply = event("b", 20, [["e", "a".repeat(64), "", "reply"]]);

    expect(eventReadFrontier(reply, { general: 10 }, "a".repeat(64))).toBe(10);
    expect(
      eventReadFrontier(reply, { general: 10, [`thread:${"a".repeat(64)}`]: 25 }, "a".repeat(64)),
    ).toBe(25);
    expect(eventReadFrontier(reply, { general: 10, [`msg:${reply.id}`]: 30 }, "a".repeat(64))).toBe(
      30,
    );
  });
});
