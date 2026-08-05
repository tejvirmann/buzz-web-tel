import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageContent } from "@/features/chat/ui/MessageContent";

const PERSON = "11".repeat(32);
const AGENT = "22".repeat(32);
const MULTILINE_CONTENT = "@Alex 第一行\n@Codex(remote) 第二行";
const PLAIN_CONTENT = "@Unknown and `@Alex`";
const IMAGE_URL = "https://relay.example.com/media/poster.png";

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

  it("reserves the final imeta dimensions while a protected image loads", () => {
    const html = renderToStaticMarkup(
      <MessageContent
        content={`![poster](${IMAGE_URL})`}
        mediaTags={[
          [
            "imeta",
            `url ${IMAGE_URL}`,
            "m image/png",
            `x ${"ab".repeat(32)}`,
            "size 1000",
            "dim 1080x1920",
          ],
        ]}
        relayUrl="wss://relay.example.com"
      />,
    );

    expect(html).toContain('data-protected-image-frame="true"');
    expect(html).toContain("aspect-ratio:1080 / 1920");
    expect(html).toContain("width:min(100%, 144px)");
  });
});
