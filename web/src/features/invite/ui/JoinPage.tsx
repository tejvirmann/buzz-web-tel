import { LoaderCircle } from "lucide-react";
import * as React from "react";
import buzzAppIcon from "@/assets/app-icon@3x.png";
import type { RuntimeConfig } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";

/** Public self-serve join page (`/join`): email in, magic link out. */
export function JoinPage({ config }: { config: RuntimeConfig }) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) throw new Error("send_failed");
      setStatus("sent");
    } catch {
      setError(t("join.error"));
      setStatus("idle");
    }
  };

  return (
    <div className="buzz-app-surface flex min-h-dvh items-center justify-center p-4">
      <main className="w-full max-w-[440px] overflow-hidden rounded-lg border border-black/10 bg-background/95 shadow-2xl backdrop-blur-xl dark:border-white/10">
        <div className="border-b px-6 pb-5 pt-7 text-center">
          <img
            alt={config.communityName}
            className="mx-auto h-14 w-14 rounded-[13px] object-cover"
            src={config.branding.logoUrl ?? buzzAppIcon}
          />
          <h1 className="mt-4 text-xl font-semibold">
            {t("join.title", { community: config.communityName })}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("join.subtitle")}</p>
        </div>

        <div className="p-6">
          {status === "sent" ? (
            <p className="text-center text-sm">{t("join.sentBody", { email })}</p>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <label className="block text-xs font-medium">
                {t("join.emailLabel")}
                <input
                  autoComplete="email"
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <button
                className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-40"
                disabled={status === "sending"}
                type="submit"
              >
                {status === "sending" ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  t("join.submit")
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
