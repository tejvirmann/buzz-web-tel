import { describe, expect, it } from "vitest";
import {
  buildDiscoveredChannels,
  membershipQueryChannelIds,
} from "@/features/chat/lib/channel-discovery";
import type { NostrEvent } from "@/shared/api/nostr-types";

const SELF = "11".repeat(32);
const OTHER = "22".repeat(32);

function event(id: string, kind: number, tags: string[][]): NostrEvent {
  return {
    id: id.repeat(64).slice(0, 64),
    kind,
    pubkey: OTHER,
    content: "",
    tags,
    created_at: 1,
    sig: "aa".repeat(64),
  };
}

describe("channel discovery privacy", () => {
  it("never requests or lists a private channel for a non-member", () => {
    const publicMetadata = event("a", 39000, [["d", "public"], ["name", "public"], ["public"]]);
    const privateMetadata = event("b", 39000, [["d", "private"], ["name", "private"], ["private"]]);

    expect(membershipQueryChannelIds([publicMetadata, privateMetadata], [])).toEqual(["public"]);
    expect(
      buildDiscoveredChannels({
        metadataEvents: [publicMetadata, privateMetadata],
        memberEvents: [],
        ownMemberEvents: [],
        currentPubkey: SELF,
      }).map((channel) => channel.id),
    ).toEqual(["public"]);
  });

  it("loads a private channel when the current identity is a member", () => {
    const privateMetadata = event("c", 39000, [["d", "private"], ["name", "private"], ["private"]]);
    const membership = event("d", 39002, [
      ["d", "private"],
      ["p", SELF, "", "member"],
    ]);

    expect(membershipQueryChannelIds([privateMetadata], [membership])).toEqual(["private"]);
    expect(
      buildDiscoveredChannels({
        metadataEvents: [privateMetadata],
        memberEvents: [],
        ownMemberEvents: [membership],
        currentPubkey: SELF,
      }).map((channel) => channel.id),
    ).toEqual(["private"]);
  });
});
