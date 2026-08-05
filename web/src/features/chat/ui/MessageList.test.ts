import { describe, expect, it } from "vitest";
import type { TimelineMessage } from "@/features/chat/lib/chat-types";
import { messageDayKey, summarizeThreads } from "@/features/chat/ui/MessageList";

function message(id: string, pubkey: string, rootId: string | null): TimelineMessage {
  return {
    event: {
      id,
      pubkey,
      kind: 9,
      content: "",
      created_at: 1,
      tags: [],
      sig: "0".repeat(128),
    },
    content: "",
    mentionPubkeys: [],
    rootId,
    parentId: rootId,
    reactions: [],
    edited: false,
    deleted: false,
    delivery: "sent",
  };
}

describe("messageDayKey", () => {
  it("groups messages from the same local calendar day", () => {
    const morning = new Date(2026, 7, 5, 8, 15).getTime() / 1_000;
    const evening = new Date(2026, 7, 5, 22, 40).getTime() / 1_000;
    const tomorrow = new Date(2026, 7, 6, 0, 5).getTime() / 1_000;

    expect(messageDayKey(morning)).toBe(messageDayKey(evening));
    expect(messageDayKey(morning)).not.toBe(messageDayKey(tomorrow));
  });
});

describe("summarizeThreads", () => {
  it("counts replies and keeps unique participants in reply order", () => {
    const rootId = "a".repeat(64);
    const codex = "b".repeat(64);
    const alex = "c".repeat(64);
    const summaries = summarizeThreads([
      message(rootId, alex, null),
      message("1".repeat(64), codex, rootId),
      message("2".repeat(64), codex.toUpperCase(), rootId),
      message("3".repeat(64), alex, rootId),
    ]);

    expect(summaries.get(rootId)).toEqual({
      count: 3,
      participantPubkeys: [codex, alex],
    });
  });
});
