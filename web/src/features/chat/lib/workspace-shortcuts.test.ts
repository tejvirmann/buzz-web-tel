import { describe, expect, it } from "vitest";
import { resolveWorkspaceShortcut } from "@/features/chat/lib/workspace-shortcuts";

function shortcut(
  key: string,
  options: Partial<{
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  }> = {},
) {
  return resolveWorkspaceShortcut({
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    key,
    ...options,
  });
}

describe("resolveWorkspaceShortcut", () => {
  it("maps primary workspace commands for macOS and other browsers", () => {
    expect(shortcut("k", { metaKey: true })).toBe("search");
    expect(shortcut("f", { ctrlKey: true })).toBe("search-channel");
    expect(shortcut(",", { metaKey: true })).toBe("settings");
    expect(shortcut("k", { ctrlKey: true, shiftKey: true })).toBe("new-dm");
    expect(shortcut("o", { metaKey: true, shiftKey: true })).toBe("browse-channels");
    expect(shortcut("n", { ctrlKey: true, shiftKey: true })).toBe("create-channel");
  });

  it("maps read shortcuts without hijacking editable controls", () => {
    expect(shortcut("Escape")).toBe("mark-current-read");
    expect(shortcut("Escape", { shiftKey: true })).toBe("mark-all-read");
    expect(
      resolveWorkspaceShortcut(
        {
          altKey: false,
          ctrlKey: false,
          key: "Escape",
          metaKey: false,
          shiftKey: false,
        },
        true,
      ),
    ).toBeNull();
  });

  it("ignores unrelated and Alt-modified shortcuts", () => {
    expect(shortcut("k", { altKey: true, metaKey: true })).toBeNull();
    expect(shortcut("x", { ctrlKey: true })).toBeNull();
    expect(shortcut("Enter")).toBeNull();
  });
});
