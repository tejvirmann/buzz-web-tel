import type { ReactNode } from "react";
import { RightPanelResizeHandle } from "@/features/chat/ui/RightPanelSizing";
import { t } from "@/shared/i18n";

export type WorkspaceTool = "agents" | "inbox" | "repos";

export function WorkspaceToolPanel({
  tool,
  maximumWidth,
  panelWidth,
  onResize,
  children,
}: {
  tool: WorkspaceTool;
  maximumWidth: number;
  panelWidth: number;
  onResize: (width: number) => void;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label={t("workspace.toolPanel", { name: t(`workspace.tool.${tool}`) })}
      className="relative flex min-h-0 shrink-0 flex-col overflow-hidden border-l bg-background/65 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:bg-background/95 max-md:shadow-xl max-md:backdrop-blur-xl max-sm:!w-full"
      data-testid={`workspace-tool-${tool}`}
      style={{ width: panelWidth }}
    >
      <RightPanelResizeHandle
        label={t("workspace.resizeToolPanel")}
        maximum={maximumWidth}
        panelWidth={panelWidth}
        onResize={onResize}
      />
      {children}
    </aside>
  );
}
