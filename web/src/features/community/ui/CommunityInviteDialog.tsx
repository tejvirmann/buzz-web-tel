import { Check, Copy, Link2, LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DialogFrame } from "@/features/chat/ui/AppDialogs";
import type { InviteOptions, MintedInvite } from "@/features/community/invite-api";
import { t } from "@/shared/i18n";
import { parsePublicKey } from "@/shared/lib/pubkey";

const TTL_OPTIONS = [
  { value: 86_400, label: "invite.ttlOneDay" as const },
  { value: 259_200, label: "invite.ttlThreeDays" as const },
  { value: 604_800, label: "invite.ttlSevenDays" as const },
  { value: 2_592_000, label: "invite.ttlThirtyDays" as const },
];

const USE_OPTIONS = [
  { value: "unlimited", label: "invite.noLimit" as const },
  { value: "1", label: "invite.oneUse" as const },
  { value: "3", label: "invite.threeUses" as const },
  { value: "5", label: "invite.fiveUses" as const },
  { value: "10", label: "invite.tenUses" as const },
  { value: "25", label: "invite.twentyFiveUses" as const },
];

export function CommunityInviteDialog({
  onClose,
  onAddMember,
  onMintInvite,
}: {
  onClose: () => void;
  onAddMember: (pubkey: string, role: "admin" | "member") => Promise<void>;
  onMintInvite: (options: InviteOptions) => Promise<MintedInvite>;
}) {
  const [mode, setMode] = useState<"member" | "link">("member");
  const [identity, setIdentity] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [ttlSecs, setTtlSecs] = useState(259_200);
  const [maxUses, setMaxUses] = useState("unlimited");
  const [invite, setInvite] = useState<MintedInvite | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onAddMember(parsePublicKey(identity), role);
      toast.success(t("invite.memberAdded"));
      onClose();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t("error.memberAdd"));
    } finally {
      setSubmitting(false);
    }
  };

  const generateInvite = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const minted = await onMintInvite({
        ttlSecs,
        maxUses: maxUses === "unlimited" ? null : Number(maxUses),
      });
      setInvite(minted);
      setCopied(false);
    } catch (mintError) {
      setError(mintError instanceof Error ? mintError.message : t("error.inviteCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  const copyInvite = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      toast.success(t("invite.linkCopied"));
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error(t("error.clipboard"));
    }
  };

  return (
    <DialogFrame title={t("invite.title")} onClose={onClose}>
      <div className="p-4">
        <div className="mb-5 grid grid-cols-2 rounded-md border bg-background p-1">
          <button
            aria-pressed={mode === "member"}
            className="flex h-8 items-center justify-center gap-2 rounded text-xs font-medium aria-pressed:bg-foreground aria-pressed:text-background"
            type="button"
            onClick={() => setMode("member")}
          >
            <UserPlus className="h-3.5 w-3.5" /> {t("invite.addMember")}
          </button>
          <button
            aria-pressed={mode === "link"}
            className="flex h-8 items-center justify-center gap-2 rounded text-xs font-medium aria-pressed:bg-foreground aria-pressed:text-background"
            type="button"
            onClick={() => setMode("link")}
          >
            <Link2 className="h-3.5 w-3.5" /> {t("invite.inviteLink")}
          </button>
        </div>

        {mode === "member" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void addMember();
            }}
          >
            <label className="block text-xs font-medium">
              {t("invite.memberIdentity")}
              <input
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="npub1… / 64-char hex"
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
              />
            </label>
            <label className="block text-xs font-medium">
              {t("invite.role")}
              <select
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={role}
                onChange={(event) => setRole(event.target.value as "admin" | "member")}
              >
                <option value="member">{t("invite.roleMember")}</option>
                <option value="admin">{t("invite.roleAdmin")}</option>
              </select>
            </label>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                className="h-9 rounded-md px-3 text-sm hover:bg-foreground/5"
                type="button"
                onClick={onClose}
              >
                {t("common.cancel")}
              </button>
              <button
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
                disabled={!identity.trim() || submitting}
                type="submit"
              >
                {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("invite.addMember")}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <label className="block text-xs font-medium">
              {t("invite.expiresAfter")}
              <select
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm"
                disabled={submitting}
                value={ttlSecs}
                onChange={(event) => setTtlSecs(Number(event.target.value))}
              >
                {TTL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium">
              {t("invite.useLimit")}
              <select
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm"
                disabled={submitting}
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
              >
                {USE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            {invite ? (
              <div className="rounded-md border bg-background p-3">
                <div className="flex items-center gap-2">
                  <input
                    aria-label={t("invite.generatedLink")}
                    className="h-8 min-w-0 flex-1 bg-transparent font-mono text-xs outline-none"
                    readOnly
                    value={invite.url}
                  />
                  <button
                    aria-label={t("invite.copyLink")}
                    className="buzz-icon-button"
                    title={t("invite.copyLink")}
                    type="button"
                    onClick={() => void copyInvite()}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("invite.expiresAt", {
                    time: new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(invite.expiresAt * 1_000),
                  })}
                </p>
              </div>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                className="h-9 rounded-md px-3 text-sm hover:bg-foreground/5"
                type="button"
                onClick={onClose}
              >
                {t("common.cancel")}
              </button>
              <button
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
                disabled={submitting}
                type="button"
                onClick={() => void generateInvite()}
              >
                {submitting ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                {invite ? t("invite.generateAnother") : t("invite.generateLink")}
              </button>
            </div>
          </div>
        )}
      </div>
    </DialogFrame>
  );
}
