import { ExternalLink } from "lucide-react";

import { t } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

export function ConnectButton({ relayUrl, className }: { relayUrl: string; className?: string }) {
  const deepLink = `buzz://connect?relay=${encodeURIComponent(relayUrl)}`;

  return (
    <Button
      asChild
      className={`bg-black text-white hover:bg-black/90 focus-visible:ring-black dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus-visible:ring-white ${className ?? ""}`}
    >
      <a href={deepLink}>
        <ExternalLink className="h-4 w-4" />
        {t("repos.openBuzz")}
      </a>
    </Button>
  );
}
