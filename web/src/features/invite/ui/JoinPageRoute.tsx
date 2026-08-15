import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { JoinPage } from "@/features/invite/ui/JoinPage";
import { loadRuntimeConfig } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";

export function JoinPageRoute() {
  const { data: config, error } = useQuery({
    queryKey: ["runtime-config"],
    queryFn: loadRuntimeConfig,
  });

  if (!config) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        {error ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t("error.configLoad")}
          </p>
        ) : (
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  return <JoinPage config={config} />;
}
