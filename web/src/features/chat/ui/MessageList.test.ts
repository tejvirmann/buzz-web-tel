import { describe, expect, it } from "vitest";
import { messageDayKey } from "@/features/chat/ui/MessageList";

describe("messageDayKey", () => {
  it("groups messages from the same local calendar day", () => {
    const morning = new Date(2026, 7, 5, 8, 15).getTime() / 1_000;
    const evening = new Date(2026, 7, 5, 22, 40).getTime() / 1_000;
    const tomorrow = new Date(2026, 7, 6, 0, 5).getTime() / 1_000;

    expect(messageDayKey(morning)).toBe(messageDayKey(evening));
    expect(messageDayKey(morning)).not.toBe(messageDayKey(tomorrow));
  });
});
