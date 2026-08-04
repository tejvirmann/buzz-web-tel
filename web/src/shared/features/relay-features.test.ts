import { describe, expect, it } from "vitest";
import { parseRelayFeatures } from "@/shared/features/relay-features";

describe("parseRelayFeatures", () => {
  it("keeps all Relay features disabled when no state is published", () => {
    expect(parseRelayFeatures(undefined)).toEqual({ projects: false, forum: false });
  });

  it("enables only explicit boolean flags from the Relay deployment", () => {
    expect(parseRelayFeatures({ projects: true, forum: "true" })).toEqual({
      projects: true,
      forum: false,
    });
  });
});
