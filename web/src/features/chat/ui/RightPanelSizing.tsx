import { useCallback, useEffect, useRef, useState } from "react";

type RightPanelKind = "member" | "thread";

type RightPanelSpec = {
  defaultWidth: number;
  minimumWidth: number;
  storageKey: string;
};

const PANEL_SPECS: Record<RightPanelKind, RightPanelSpec> = {
  member: {
    defaultWidth: 256,
    minimumWidth: 240,
    storageKey: "buzz-web-member-panel-width-v2",
  },
  thread: {
    defaultWidth: 380,
    minimumWidth: 300,
    storageKey: "buzz-web-thread-panel-width-v2",
  },
};

const MAX_PANEL_WIDTH = 720;
const MAIN_CONTENT_MIN_WIDTH = 720;

function panelMaximum(minimumWidth: number): number {
  if (typeof window === "undefined") return MAX_PANEL_WIDTH;
  return Math.min(
    MAX_PANEL_WIDTH,
    Math.max(minimumWidth, window.innerWidth - MAIN_CONTENT_MIN_WIDTH),
  );
}

function clampPanelWidth(width: number, spec: RightPanelSpec): number {
  return Math.min(panelMaximum(spec.minimumWidth), Math.max(spec.minimumWidth, width));
}

function savedPanelWidth(spec: RightPanelSpec): number {
  if (typeof window === "undefined") return spec.defaultWidth;
  try {
    const stored = localStorage.getItem(spec.storageKey) ?? "";
    const value = Number.parseInt(stored, 10);
    return Number.isFinite(value) ? clampPanelWidth(value, spec) : spec.defaultWidth;
  } catch {
    return spec.defaultWidth;
  }
}

function clearDragStyles(): void {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

export function useRightPanelWidth(kind: RightPanelKind) {
  const spec = PANEL_SPECS[kind];
  const [panelWidth, setPanelWidthState] = useState(() => savedPanelWidth(spec));
  const [maximum, setMaximum] = useState(() => panelMaximum(spec.minimumWidth));

  const setPanelWidth = useCallback(
    (width: number) => {
      const next = clampPanelWidth(width, spec);
      setPanelWidthState(next);
      try {
        localStorage.setItem(spec.storageKey, String(next));
      } catch {
        // Storage may be disabled; resizing still works for the current session.
      }
    },
    [spec],
  );

  useEffect(() => {
    const handleResize = () => {
      setMaximum(panelMaximum(spec.minimumWidth));
      setPanelWidthState((width) => clampPanelWidth(width, spec));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [spec]);

  return { maximum, minimum: spec.minimumWidth, panelWidth, setPanelWidth };
}

export function RightPanelResizeHandle({
  label,
  maximum,
  minimum,
  panelWidth,
  onResize,
}: {
  label: string;
  maximum: number;
  minimum: number;
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
      aria-valuemin={minimum}
      aria-valuenow={panelWidth}
      className="absolute inset-y-0 left-0 z-40 h-auto w-2 -translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent outline-none transition-colors hover:bg-primary/20 focus:bg-primary/30 max-sm:hidden"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onResize(panelWidth + 24);
        else if (event.key === "ArrowRight") onResize(panelWidth - 24);
        else if (event.key === "Home") onResize(minimum);
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
        onResize(dragStart.current.width + dragStart.current.pointerX - event.clientX);
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
