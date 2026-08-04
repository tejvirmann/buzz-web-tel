import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import buzzAppIcon from "@/assets/app-icon@3x.png";
import { IdentityGate } from "@/features/chat/ui/IdentityGate";
import { loadRuntimeConfig, type RuntimeConfig } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";

export function AuthenticatedRoute({
  children,
}: {
  children: React.ReactNode | ((config: RuntimeConfig) => React.ReactNode);
}) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRuntimeConfig()
      .then(setConfig)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : t("error.configLoad")),
      );
  }, []);

  if (!config) {
    return (
      <div className="buzz-app-surface flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <img alt="Buzz" className="mx-auto h-12 w-12 rounded-xl" src={buzzAppIcon} />
          {error ? (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          ) : (
            <LoaderCircle className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }

  return (
    <IdentityGate config={config}>
      {() => (typeof children === "function" ? children(config) : children)}
    </IdentityGate>
  );
}
