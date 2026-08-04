import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_PANEL_WIDTH = 250;
const MIN_PANEL_WIDTH = 180;
const MAX_PANEL_WIDTH = 420;
const MAIN_CONTENT_MIN_WIDTH = 420;
const ICON_RAIL_WIDTH = 60;
const PANEL_WIDTH_KEY = "buzz-web-left-panel-width";

function panelMaximum(): number {
  if (typeof window === "undefined") return MAX_PANEL_WIDTH;
  return Math.min(
    MAX_PANEL_WIDTH,
    Math.max(MIN_PANEL_WIDTH, window.innerWidth - ICON_RAIL_WIDTH - MAIN_CONTENT_MIN_WIDTH),
  );
}

function clampPanelWidth(width: number): number {
  return Math.min(panelMaximum(), Math.max(MIN_PANEL_WIDTH, width));
}

function savedPanelWidth(): number {
  if (typeof window === "undefined") return DEFAULT_PANEL_WIDTH;
  try {
    const value = Number.parseInt(localStorage.getItem(PANEL_WIDTH_KEY) ?? "", 10);
    return Number.isFinite(value) ? clampPanelWidth(value) : DEFAULT_PANEL_WIDTH;
  } catch {
    return DEFAULT_PANEL_WIDTH;
  }
}

function clearDragStyles(): void {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

export function useLeftPanelWidth() {
  const [panelWidth, setPanelWidthState] = useState(savedPanelWidth);
  const [maximum, setMaximum] = useState(panelMaximum);

  const setPanelWidth = useCallback((width: number) => {
    const next = clampPanelWidth(width);
    setPanelWidthState(next);
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(next));
    } catch {
      // Storage may be disabled; resizing still works for the current session.
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setMaximum(panelMaximum());
      setPanelWidthState((width) => clampPanelWidth(width));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { maximum, panelWidth, setPanelWidth };
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
  const dragStart = useRef<{ pointerX: number; width: number } | null>(null);

  useEffect(() => clearDragStyles, []);

  return (
    <hr
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={maximum}
      aria-valuemin={MIN_PANEL_WIDTH}
      aria-valuenow={panelWidth}
      className="absolute inset-y-0 right-0 z-40 h-auto w-2 cursor-col-resize touch-none border-0 bg-transparent outline-none transition-colors hover:bg-primary/20 focus:bg-primary/30 max-md:hidden"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onResize(panelWidth - 24);
        else if (event.key === "ArrowRight") onResize(panelWidth + 24);
        else if (event.key === "Home") onResize(MIN_PANEL_WIDTH);
        else if (event.key === "End") onResize(maximum);
        else return;
        event.preventDefault();
      }}
      onPointerCancel={() => {
        dragStart.current = null;
        clearDragStyles();
      }}
      onPointerDown={(event) => {
        dragStart.current = { pointerX: event.clientX, width: panelWidth };
        event.currentTarget.setPointerCapture(event.pointerId);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(event) => {
        if (!dragStart.current) return;
        onResize(dragStart.current.width + event.clientX - dragStart.current.pointerX);
      }}
      onPointerUp={(event) => {
        dragStart.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        clearDragStyles();
      }}
    />
  );
}
