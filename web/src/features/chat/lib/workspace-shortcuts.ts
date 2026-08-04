export type WorkspaceShortcut =
  | "browse-channels"
  | "create-channel"
  | "mark-all-read"
  | "mark-current-read"
  | "new-dm"
  | "search"
  | "search-channel"
  | "settings";

type ShortcutEvent = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA")
  );
}

export function resolveWorkspaceShortcut(
  event: ShortcutEvent,
  editableTarget = false,
): WorkspaceShortcut | null {
  const key = event.key.toLocaleLowerCase();
  const primaryModifier = event.metaKey || event.ctrlKey;

  if (!primaryModifier) {
    if (event.altKey || editableTarget || key !== "escape") return null;
    return event.shiftKey ? "mark-all-read" : "mark-current-read";
  }
  if (event.altKey) return null;

  if (event.shiftKey) {
    if (key === "k") return "new-dm";
    if (key === "o") return "browse-channels";
    if (key === "n") return "create-channel";
    return null;
  }

  if (key === "k") return "search";
  if (key === "f") return "search-channel";
  if (key === ",") return "settings";
  return null;
}
