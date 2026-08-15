import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import * as React from "react";
import buzzAppIcon from "@/assets/app-icon@3x.png";
import { claimInviteAsActiveSigner } from "@/features/invite/invite-api";
import type { RuntimeConfig } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";
import { generateAutoPassphrase, rememberAutoUnlock } from "@/shared/lib/auto-session";
import { saveSecretKey } from "@/shared/lib/identity-vault";
import {
  activateLocalSigner,
  createIdentityBackup,
  generateIdentitySecretKey,
  restoreIdentityBackup,
} from "@/shared/lib/nostr-signer";
import {
  PENDING_DEFAULT_CHANNELS_KEY,
  PENDING_PROFILE_NAME_KEY,
} from "@/shared/lib/pending-profile";
import { Button } from "@/shared/ui/button";

type NewClaim = { kind: "new"; relayUrl: string; inviteCode: string };

/** Resolves the emailed token: new members get a name prompt back; returning members are restored and redirected here, never rendering a form at all. */
async function resolveClaim(token: string): Promise<NewClaim> {
  const response = await fetch(`/api/claim?token=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error("token_invalid");
  const claim = (await response.json()) as
    | NewClaim
    | { kind: "returning"; relayUrl: string; encryptedKey: string; backupPassword: string };

  if (claim.kind === "new") return claim;

  const secret = restoreIdentityBackup(claim.encryptedKey, claim.backupPassword);
  try {
    const pubkey = activateLocalSigner(secret);
    const devicePassphrase = generateAutoPassphrase();
    await saveSecretKey(secret, pubkey, devicePassphrase);
    rememberAutoUnlock(pubkey, devicePassphrase);
  } finally {
    secret.fill(0);
  }
  window.location.assign("/");
  return new Promise<NewClaim>(() => {}); // hold here; we're navigating away
}

async function claimAsNewMember(claim: NewClaim, token: string, name: string): Promise<void> {
  const secret = generateIdentitySecretKey();
  try {
    const pubkey = activateLocalSigner(secret);
    const devicePassphrase = generateAutoPassphrase();
    await saveSecretKey(secret, pubkey, devicePassphrase);
    rememberAutoUnlock(pubkey, devicePassphrase);

    await claimInviteAsActiveSigner(claim.relayUrl, claim.inviteCode);

    const backupPassword = generateAutoPassphrase();
    const ncryptsec = createIdentityBackup(secret, backupPassword);
    const response = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, pubkey, ncryptsec, backupPassword }),
    });
    if (!response.ok) throw new Error("backup_failed");
  } finally {
    secret.fill(0);
  }
  window.localStorage.setItem(PENDING_PROFILE_NAME_KEY, name.trim());
  window.localStorage.setItem(PENDING_DEFAULT_CHANNELS_KEY, "1");
  window.location.assign("/");
}

/** Landing page for an emailed join/login link (`/claim?token=...`). */
export function ClaimPage({ config }: { config: RuntimeConfig }) {
  const token = React.useMemo(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
    [],
  );
  const [name, setName] = React.useState("");

  const claimQuery = useQuery({
    queryKey: ["claim", token],
    queryFn: () => resolveClaim(token),
    enabled: Boolean(token),
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () => {
      if (!claimQuery.data) throw new Error("not_ready");
      return claimAsNewMember(claimQuery.data, token, name);
    },
  });

  return (
    <div className="buzz-app-surface flex min-h-dvh items-center justify-center p-4">
      <main className="w-full max-w-[440px] overflow-hidden rounded-lg border border-black/10 bg-background/95 shadow-2xl backdrop-blur-xl dark:border-white/10">
        <div className="border-b px-6 pb-5 pt-7 text-center">
          <img
            alt={config.communityName}
            className="mx-auto h-14 w-14 rounded-[13px] object-cover"
            src={config.branding.logoUrl ?? buzzAppIcon}
          />
          <h1 className="mt-4 text-xl font-semibold">{config.communityName}</h1>
        </div>

        <div className="p-6">
          {!token || claimQuery.isError ? (
            <div className="space-y-4 text-center">
              <h2 className="text-sm font-semibold">{t("claim.invalidTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("claim.invalidBody")}</p>
              <Button asChild className="h-10 w-full">
                <a href="/join">{t("claim.backToJoin")}</a>
              </Button>
            </div>
          ) : !claimQuery.data ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> {t("claim.loading")}
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                joinMutation.mutate();
              }}
            >
              <h2 className="text-center text-sm font-semibold">{t("claim.nameTitle")}</h2>
              <label className="block text-xs font-medium">
                {t("claim.nameLabel")}
                <input
                  autoComplete="name"
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              {joinMutation.isError ? (
                <p className="text-xs text-destructive">{t("claim.error")}</p>
              ) : null}
              <button
                className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-40"
                disabled={joinMutation.isPending || !name.trim()}
                type="submit"
              >
                {joinMutation.isPending ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  t("claim.nameSubmit")
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
