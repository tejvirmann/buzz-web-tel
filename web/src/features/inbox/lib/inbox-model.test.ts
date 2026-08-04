import { describe, expect, it } from "vitest";
import type { BuzzChannel } from "@/features/chat/lib/chat-types";
import { buildInboxItems, inboxPreview } from "@/features/inbox/lib/inbox-model";
import type { NostrEvent } from "@/shared/api/nostr-types";

const ME = "1".repeat(64);
const OTHER = "2".repeat(64);
const ROOT = "a".repeat(64);

function event(
  id: string,
  pubkey: string,
  kind: number,
  tags: string[][],
  content = id,
  createdAt = 1,
): NostrEvent {
  return {
    id: id.repeat(64).slice(0, 64),
    pubkey,
    kind,
    tags,
    content,
    created_at: createdAt,
    sig: "0".repeat(128),
  };
}

const channels: BuzzChannel[] = [
  {
    id: "general",
    name: "general",
    description: "",
    topic: null,
    type: "stream",
    visibility: "open",
    archived: false,
    members: [],
    participantPubkeys: [],
  },
  {
    id: "dm",
    name: "DM",
    description: "",
    topic: null,
    type: "dm",
    visibility: "private",
    archived: false,
    members: [],
    participantPubkeys: [ME, OTHER],
  },
];

describe("buildInboxItems", () => {
  it("classifies mentions, DMs, thread replies, and approvals", () => {
    const events = [
      event("a", ME, 9, [["h", "general"]], "root", 1),
      event(
        "b",
        OTHER,
        9,
        [
          ["h", "general"],
          ["p", ME],
        ],
        "mention",
        2,
      ),
      event("c", OTHER, 9, [["h", "dm"]], "dm", 3),
      event(
        "d",
        OTHER,
        9,
        [
          ["h", "general"],
          ["e", ROOT, "", "reply"],
        ],
        "reply",
        4,
      ),
      event(
        "e",
        OTHER,
        46010,
        [
          ["p", ME],
          ["d", "f".repeat(64)],
        ],
        "approval",
        5,
      ),
      event("f", OTHER, 9, [["h", "general"]], "unrelated", 6),
    ];
    const items = buildInboxItems({
      events,
      channels,
      currentPubkey: ME,
      readIds: new Set(["b".repeat(64)]),
    });

    expect(items.map((item) => item.category)).toEqual(["needs_action", "thread", "dm", "mention"]);
    expect(items[items.length - 1]?.unread).toBe(false);
    expect(items.find((item) => item.category === "thread")?.threadRootId).toBe(ROOT);
  });

  it("removes approvals after a matching result event arrives", () => {
    const reference = "f".repeat(64);
    const items = buildInboxItems({
      events: [
        event(
          "a",
          OTHER,
          46010,
          [
            ["p", ME],
            ["d", reference],
          ],
          "approval",
          1,
        ),
        event("b", OTHER, 46011, [["d", reference]], "approved", 2),
      ],
      channels,
      currentPubkey: ME,
      readIds: new Set(),
    });
    expect(items).toEqual([]);
  });
});

describe("inboxPreview", () => {
  it("extracts a human-readable field from JSON event content", () => {
    expect(inboxPreview(event("a", OTHER, 46010, [], '{"summary":"Deploy now"}'))).toBe(
      "Deploy now",
    );
  });
});
