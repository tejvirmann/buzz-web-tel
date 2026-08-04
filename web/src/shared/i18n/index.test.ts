import { describe, expect, it } from "vitest";
import { resolveLocale } from "@/shared/i18n";

describe("resolveLocale", () => {
  it("uses Chinese when the preferred browser language is Chinese", () => {
    expect(resolveLocale(["zh-Hans-CN", "en-US"])).toBe("zh-CN");
  });

  it("uses English when it is preferred, even with Chinese as a fallback", () => {
    expect(resolveLocale(["en-US", "zh-CN"])).toBe("en");
  });
});
