import { describe, expect, it } from "vitest";
import { parseRelayFeatures, resolveRelayFeatures } from "@/shared/features/relay-features";

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

  it("keeps features visible when matching content exists on the Relay", () => {
    expect(
      resolveRelayFeatures({ projects: false, forum: false }, { projects: true, forum: true }),
    ).toEqual({ projects: true, forum: true });
  });

  it("does not invent features without deployment flags or Relay content", () => {
    expect(
      resolveRelayFeatures({ projects: false, forum: false }, { projects: false, forum: false }),
    ).toEqual({ projects: false, forum: false });
  });
});
