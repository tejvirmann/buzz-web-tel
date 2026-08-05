import { PanelResizeHandle, usePersistedPanelWidth } from "@/shared/ui/resizable-panel";

const DEFAULT_PANEL_WIDTH = 188;
const MIN_PANEL_WIDTH = 168;
const MAX_PANEL_WIDTH = 360;
const PANEL_WIDTH_KEY = "buzz-web-left-panel-width-v2";

export function useLeftPanelWidth() {
  return usePersistedPanelWidth({
    defaultWidth: DEFAULT_PANEL_WIDTH,
    maximumWidth: MAX_PANEL_WIDTH,
    minimumWidth: MIN_PANEL_WIDTH,
    reservedWidth: 464,
    storageKey: PANEL_WIDTH_KEY,
  });
}

export function LeftPanelResizeHandle({
  label,
  maximum,
  panelWidth,
  onResize,
}: {
  label: string;
  maximum: number;
  panelWidth: number;
  onResize: (width: number) => void;
}) {
  return (
    <PanelResizeHandle
      className="right-0 z-40 transition-colors hover:bg-primary/20 focus:bg-primary/30 max-md:hidden"
      edge="right"
      label={label}
      maximum={maximum}
      minimum={MIN_PANEL_WIDTH}
      panelWidth={panelWidth}
      onResize={onResize}
    />
  );
}
