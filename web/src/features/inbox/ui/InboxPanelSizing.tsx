import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_WIDTH = 315;
const MINIMUM_WIDTH = 280;
const MAXIMUM_WIDTH = 480;
const DETAIL_MINIMUM_WIDTH = 480;
const STORAGE_KEY = "buzz-web-inbox-list-width-v1";

function maximumWidth(): number {
  if (typeof window === "undefined") return MAXIMUM_WIDTH;
  return Math.min(MAXIMUM_WIDTH, Math.max(MINIMUM_WIDTH, window.innerWidth - DETAIL_MINIMUM_WIDTH));
}

function clampWidth(width: number): number {
  return Math.min(maximumWidth(), Math.max(MINIMUM_WIDTH, width));
}

function savedWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  try {
    const stored = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? "", 10);
    return Number.isFinite(stored) ? clampWidth(stored) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function clearDragStyles(): void {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

export function useInboxListWidth() {
  const [panelWidth, setPanelWidthState] = useState(savedWidth);
  const [maximum, setMaximum] = useState(maximumWidth);
  const setPanelWidth = useCallback((width: number) => {
    const next = clampWidth(width);
    setPanelWidthState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Resizing remains available when browser storage is disabled.
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setMaximum(maximumWidth());
      setPanelWidthState((width) => clampWidth(width));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { maximum, panelWidth, setPanelWidth };
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
  const dragStart = useRef<{ pointerX: number; width: number } | null>(null);
  useEffect(() => clearDragStyles, []);

  return (
    <hr
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={maximum}
      aria-valuemin={MINIMUM_WIDTH}
      aria-valuenow={panelWidth}
      className="absolute inset-y-0 right-0 z-20 hidden h-auto w-2 translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent outline-none hover:bg-ring/20 focus:bg-ring/25 lg:block"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onResize(panelWidth - 24);
        else if (event.key === "ArrowRight") onResize(panelWidth + 24);
        else if (event.key === "Home") onResize(MINIMUM_WIDTH);
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
