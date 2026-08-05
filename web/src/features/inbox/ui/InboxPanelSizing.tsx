import { PanelResizeHandle, usePersistedPanelWidth } from "@/shared/ui/resizable-panel";

const DEFAULT_WIDTH = 315;
const MINIMUM_WIDTH = 280;
const MAXIMUM_WIDTH = 480;
const STORAGE_KEY = "buzz-web-inbox-list-width-v1";

export function useInboxListWidth() {
  return usePersistedPanelWidth({
    defaultWidth: DEFAULT_WIDTH,
    maximumWidth: MAXIMUM_WIDTH,
    minimumWidth: MINIMUM_WIDTH,
    reservedWidth: 480,
    storageKey: STORAGE_KEY,
  });
}

export function InboxListResizeHandle({
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
      className="right-0 z-20 hidden translate-x-1/2 hover:bg-ring/20 focus:bg-ring/25 lg:block"
      edge="right"
      label={label}
      maximum={maximum}
      minimum={MINIMUM_WIDTH}
      panelWidth={panelWidth}
      onResize={onResize}
    />
  );
}
