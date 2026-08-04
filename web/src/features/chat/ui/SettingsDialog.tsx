import { Download, KeyRound, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import type { UserProfile } from "@/features/chat/lib/chat-types";
import { connectionStateLabel } from "@/features/chat/lib/connection-state";
import { DialogFrame } from "@/features/chat/ui/AppDialogs";
import type { RelayConnectionState } from "@/shared/api/nostr-types";
import { t } from "@/shared/i18n";
import { downloadIdentityBackup } from "@/shared/lib/identity-backup";
import { createActiveIdentityBackup, getActiveSignerMode } from "@/shared/lib/nostr-signer";
import { useTheme } from "@/shared/theme/ThemeProvider";

export function SettingsDialog({
  relayUrl,
  pubkey,
  profile,
  connectionState,
  onClose,
  onSwitchIdentity,
  onUpdateProfile,
}: {
  relayUrl: string;
  pubkey: string;
  profile: UserProfile;
  connectionState: RelayConnectionState;
  onClose: () => void;
  onSwitchIdentity: () => void;
  onUpdateProfile: (input: { name: string; about: string; picture: string }) => Promise<void>;
}) {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile.name);
  const [about, setAbout] = useState(profile.about);
  const [picture, setPicture] = useState(profile.picture ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupConfirmation, setBackupConfirmation] = useState("");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localIdentity = getActiveSignerMode() === "local";

  return (
    <DialogFrame title={t("common.settings")} width="max-w-xl" onClose={onClose}>
      <div className="buzz-scrollbar max-h-[78dvh] space-y-5 overflow-y-auto p-4">
        <div>
          <div className="mb-2 text-xs font-medium">{t("dialog.appearance")}</div>
          <div className="inline-flex rounded-md border bg-background p-1">
            {(["light", "dark", "system"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={theme === value}
                className={`h-8 rounded px-3 text-xs ${theme === value ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}
                type="button"
                onClick={() => setTheme(value)}
              >
                {value === "light"
                  ? t("dialog.light")
                  : value === "dark"
                    ? t("dialog.dark")
                    : t("dialog.systemTheme")}
              </button>
            ))}
          </div>
        </div>

        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSavingProfile(true);
            setError(null);
            void onUpdateProfile({ name, about, picture })
              .catch((profileError) =>
                setError(
                  profileError instanceof Error ? profileError.message : t("error.profileUpdate"),
                ),
              )
              .finally(() => setSavingProfile(false));
          }}
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            <UserRound className="h-4 w-4" /> {t("profile.title")}
          </div>
          <label className="block text-xs font-medium">
            {t("profile.name")}
            <input
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium">
            {t("profile.about")}
            <textarea
              className="mt-1.5 min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={500}
              value={about}
              onChange={(event) => setAbout(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium">
            {t("profile.picture")}
            <input
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={t("profile.picturePlaceholder")}
              type="url"
              value={picture}
              onChange={(event) => setPicture(event.target.value)}
            />
          </label>
          <div className="flex justify-end">
            <button
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
              disabled={!name.trim() || savingProfile}
              type="submit"
            >
              {savingProfile ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("profile.save")}
            </button>
          </div>
        </form>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-2 text-xs font-medium">
            <LockKeyhole className="h-4 w-4" /> {t("dialog.relaySession")}
          </div>
          <dl className="grid grid-cols-[5rem_1fr] gap-y-2 text-xs">
            <dt className="text-muted-foreground">{t("field.status")}</dt>
            <dd>{connectionStateLabel(connectionState)}</dd>
            <dt className="text-muted-foreground">{t("field.address")}</dt>
            <dd className="break-all font-mono">{relayUrl}</dd>
            <dt className="text-muted-foreground">{t("field.publicKey")}</dt>
            <dd className="break-all font-mono">{pubkey}</dd>
          </dl>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2 text-xs font-medium">
            <KeyRound className="h-4 w-4" /> {t("identity.backup")}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {localIdentity ? t("identity.backupWarning") : t("identity.extensionBackup")}
          </p>
          {localIdentity && backupOpen ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium">
                {t("identity.backupPassphrase")}
                <input
                  autoComplete="new-password"
                  className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  minLength={12}
                  type="password"
                  value={backupPassword}
                  onChange={(event) => setBackupPassword(event.target.value)}
                />
              </label>
              <label className="block text-xs font-medium">
                {t("identity.confirmPassphrase")}
                <input
                  autoComplete="new-password"
                  className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  minLength={12}
                  type="password"
                  value={backupConfirmation}
                  onChange={(event) => setBackupConfirmation(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          {localIdentity ? (
            <button
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-foreground/5 disabled:opacity-40"
              disabled={
                creatingBackup ||
                (backupOpen &&
                  (backupPassword.length < 12 || backupPassword !== backupConfirmation))
              }
              type="button"
              onClick={() => {
                if (!backupOpen) {
                  setBackupOpen(true);
                  return;
                }
                setCreatingBackup(true);
                setError(null);
                window.setTimeout(() => {
                  try {
                    const backup = createActiveIdentityBackup(backupPassword);
                    downloadIdentityBackup(backup, pubkey);
                    setBackupPassword("");
                    setBackupConfirmation("");
                    setBackupOpen(false);
                  } catch (backupError) {
                    setError(
                      backupError instanceof Error ? backupError.message : t("error.backupCreate"),
                    );
                  } finally {
                    setCreatingBackup(false);
                  }
                }, 0);
              }}
            >
              {creatingBackup ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {backupOpen ? t("identity.downloadBackup") : t("identity.createBackup")}
            </button>
          ) : null}
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex justify-end border-t pt-4">
          <button
            className="h-9 rounded-md border px-3 text-sm hover:bg-foreground/5"
            type="button"
            onClick={onSwitchIdentity}
          >
            {t("identity.switch")}
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
