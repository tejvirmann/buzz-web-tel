import { Eye, EyeOff, KeyRound, LoaderCircle, PlugZap, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import buzzAppIcon from "@/assets/app-icon@3x.png";
import type { RuntimeConfig } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";
import {
  deleteVault,
  readVaultMetadata,
  saveSecretKey,
  unlockSecretKey,
  type VaultMetadata,
} from "@/shared/lib/identity-vault";
import {
  activateLocalSigner,
  activateNip07Signer,
  clearActiveSigner,
  getActiveSignerPubkey,
  hasNip07Provider,
  parseSecretKey,
} from "@/shared/lib/nostr-signer";

export function IdentityGate({
  config,
  children,
}: {
  config: RuntimeConfig;
  children: (identity: { pubkey: string; signOut: () => void; demo: boolean }) => React.ReactNode;
}) {
  const [pubkey, setPubkey] = useState<string | null>(() =>
    config.demoMode ? "f".repeat(64) : getActiveSignerPubkey(),
  );
  const [vault, setVault] = useState<VaultMetadata | null>(null);
  const [checkingVault, setCheckingVault] = useState(!config.demoMode);
  const [showImport, setShowImport] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [remember, setRemember] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config.demoMode) return;
    void readVaultMetadata()
      .then(setVault)
      .catch((vaultError) =>
        setError(vaultError instanceof Error ? vaultError.message : t("error.vaultRead")),
      )
      .finally(() => setCheckingVault(false));
  }, [config.demoMode]);

  if (pubkey) {
    return children({
      pubkey,
      demo: config.demoMode,
      signOut: () => {
        clearActiveSigner();
        setPubkey(null);
        setPassphrase("");
        setSecretInput("");
      },
    });
  }

  const run = async (operation: () => Promise<string>) => {
    setWorking(true);
    setError(null);
    try {
      setPubkey(await operation());
    } catch (operationError) {
      setError(
        operationError instanceof Error ? operationError.message : t("error.identityUnlock"),
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="buzz-app-surface flex min-h-dvh items-center justify-center p-4">
      <main className="w-full max-w-[420px] overflow-hidden rounded-lg border border-black/10 bg-background/95 shadow-2xl backdrop-blur-xl dark:border-white/10">
        <div className="border-b px-6 pb-5 pt-7 text-center">
          <img alt="Buzz" className="mx-auto h-14 w-14 rounded-[13px]" src={buzzAppIcon} />
          <h1 className="mt-4 text-xl font-semibold">{config.communityName}</h1>
          <p className="mt-1 truncate text-xs text-muted-foreground">{config.relayUrl}</p>
        </div>

        {checkingVault ? (
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> {t("identity.checking")}
          </div>
        ) : vault && !showImport ? (
          <form
            className="space-y-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const secret = await unlockSecretKey(passphrase);
                try {
                  return activateLocalSigner(secret);
                } finally {
                  secret.fill(0);
                }
              });
            }}
          >
            <div className="flex items-center gap-3 rounded-md bg-foreground/5 px-3 py-2.5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="min-w-0">
                <div className="text-xs font-medium">{t("identity.saved")}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {vault.pubkey}
                </div>
              </div>
            </div>
            <label className="block text-xs font-medium">
              {t("identity.passphrase")}
              <input
                autoComplete="current-password"
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
            </label>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <button
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-40"
              disabled={!passphrase || working}
              type="submit"
            >
              {working ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              {t("identity.unlock")}
            </button>
            <div className="flex justify-between text-xs">
              <button
                className="text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => {
                  setShowImport(true);
                  setError(null);
                }}
              >
                {t("identity.useAnother")}
              </button>
              <button
                className="inline-flex items-center text-muted-foreground hover:text-destructive"
                type="button"
                onClick={() => {
                  void deleteVault().then(() => {
                    setVault(null);
                    setShowImport(true);
                  });
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> {t("identity.forget")}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 p-6">
            <button
              className="flex h-10 w-full items-center justify-center rounded-md border bg-background text-sm font-medium hover:bg-foreground/5 disabled:opacity-40"
              disabled={!hasNip07Provider() || working}
              type="button"
              onClick={() => void run(activateNip07Signer)}
            >
              <PlugZap className="mr-2 h-4 w-4" /> {t("identity.nip07")}
            </button>
            <div className="flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t("identity.or")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const secret = parseSecretKey(secretInput);
                  try {
                    const identityPubkey = activateLocalSigner(secret);
                    if (remember) await saveSecretKey(secret, identityPubkey, passphrase);
                    setSecretInput("");
                    return identityPubkey;
                  } finally {
                    secret.fill(0);
                  }
                });
              }}
            >
              <label className="block text-xs font-medium">
                {t("identity.secret")}
                <span className="relative mt-1.5 block">
                  <input
                    autoComplete="off"
                    className="h-10 w-full rounded-md border bg-background px-3 pr-10 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/30"
                    spellCheck={false}
                    type={showSecret ? "text" : "password"}
                    value={secretInput}
                    onChange={(event) => setSecretInput(event.target.value)}
                  />
                  <button
                    aria-label={showSecret ? t("identity.hideSecret") : t("identity.showSecret")}
                    className="buzz-icon-button absolute right-1 top-1 h-8 w-8 flex-none"
                    type="button"
                    onClick={() => setShowSecret((show) => !show)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  checked={remember}
                  type="checkbox"
                  onChange={(event) => setRemember(event.target.checked)}
                />
                {t("identity.remember")}
              </label>
              {remember ? (
                <label className="block text-xs font-medium">
                  {t("identity.newPassphrase")}
                  <input
                    autoComplete="new-password"
                    className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    minLength={8}
                    type="password"
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                  />
                </label>
              ) : null}
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <button
                className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-40"
                disabled={!secretInput.trim() || working || (remember && passphrase.length < 8)}
                type="submit"
              >
                {working ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                {t("identity.connectRelay")}
              </button>
            </form>
            {vault ? (
              <button
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => setShowImport(false)}
              >
                {t("identity.returnSaved")}
              </button>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
