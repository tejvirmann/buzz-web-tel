import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageContent } from "@/features/chat/ui/MessageContent";

const PERSON = "11".repeat(32);
const AGENT = "22".repeat(32);
const MULTILINE_CONTENT = "@Alex 第一行\n@Codex(remote) 第二行";
const PLAIN_CONTENT = "@Unknown and `@Alex`";

describe("MessageContent", () => {
  it("renders human and agent mentions and preserves soft line breaks", () => {
    const html = renderToStaticMarkup(
      <MessageContent
        content={MULTILINE_CONTENT}
        mentions={[
          { pubkey: PERSON, name: "Alex", isAgent: false },
          { pubkey: AGENT, name: "Codex(remote)", isAgent: true },
        ]}
        relayUrl="wss://relay.example.com"
      />,
    );

    expect(html.match(/data-mention=""/g)).toHaveLength(2);
    expect(html).toContain(`data-mention-pubkey="${PERSON}"`);
    expect(html).toContain(`data-mention-pubkey="${AGENT}"`);
    expect(html).toContain('buzz-message-mention-prefix">@</span>Alex');
    expect(html).toContain('data-mention-agent="true"');
    expect(html).toContain("buzz-message-mention-icon");
    expect(html).toContain("<br/>");
  });

  it("keeps untagged mentions and inline code as plain content", () => {
    const html = renderToStaticMarkup(
      <MessageContent
        content={PLAIN_CONTENT}
        mentions={[{ pubkey: PERSON, name: "Alex", isAgent: false }]}
        relayUrl="wss://relay.example.com"
      />,
    );

    expect(html).not.toContain('data-mention=""');
    expect(html).toContain("@Unknown and <code>@Alex</code>");
  });
});
