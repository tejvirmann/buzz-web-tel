import type { RelayConnectionState } from "@/shared/api/nostr-types";
import { t } from "@/shared/i18n";

export function connectionStateLabel(state: RelayConnectionState): string {
  switch (state) {
    case "connected":
      return t("connection.connected");
    case "connecting":
      return t("connection.connecting");
    case "reconnecting":
      return t("connection.reconnecting");
    case "disconnected":
      return t("connection.disconnected");
    case "idle":
      return t("connection.idle");
  }
}
