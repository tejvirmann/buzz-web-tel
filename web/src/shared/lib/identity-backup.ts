export function downloadIdentityBackup(backup: string, pubkey: string): void {
  const blob = new Blob([backup], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `buzz-identity-${pubkey.slice(0, 8)}.ncryptsec`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
