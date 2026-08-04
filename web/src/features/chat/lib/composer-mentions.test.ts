import { describe, expect, it } from "vitest";
import { detectMentionQuery, insertMention } from "@/features/chat/lib/composer-mentions";

describe("composer mentions", () => {
  it("detects names with parentheses and inserts the full display name", () => {
    const content = "ask @Co";
    const query = detectMentionQuery(content, content.length, ["Codex(remote)", "Grok(remote)"]);

    expect(query).toEqual({ query: "Co", startIndex: 4, endIndex: 7 });
    if (!query) throw new Error("Expected an active mention query");
    expect(insertMention(content, query, "Codex(remote)")).toEqual({
      value: "ask @Codex(remote) ",
      cursorPosition: 19,
    });
  });

  it("keeps a multi-word mention open only while it matches a known member", () => {
    const content = "(@Codex Remote";
    expect(detectMentionQuery(content, content.length, ["Codex Remote"])).toMatchObject({
      query: "Codex Remote",
      startIndex: 1,
    });
    expect(detectMentionQuery("mail@example.com", 16, ["Example"])).toBeNull();
    expect(detectMentionQuery("@Codex Remote ", 14, ["Codex Remote"])).toBeNull();
  });

  it("replaces only the active query when editing in the middle of text", () => {
    const content = "ping @Gr before deploy";
    const cursorPosition = 8;
    const query = detectMentionQuery(content, cursorPosition, ["Grok(remote)"]);

    if (!query) throw new Error("Expected an active mention query");
    expect(insertMention(content, query, "Grok(remote)")).toEqual({
      value: "ping @Grok(remote) before deploy",
      cursorPosition: 19,
    });
  });
});
