import { useCallback, useEffect, useRef, useState } from "react";

type PersistedPanelWidthOptions = {
  defaultWidth: number;
  maximumWidth: number;
  minimumWidth: number;
  reservedWidth: number;
  storageKey: string;
};

function availableMaximum({
  maximumWidth,
  minimumWidth,
  reservedWidth,
}: PersistedPanelWidthOptions): number {
  if (typeof window === "undefined") return maximumWidth;
  return Math.min(maximumWidth, Math.max(minimumWidth, window.innerWidth - reservedWidth));
}

export function usePersistedPanelWidth(options: PersistedPanelWidthOptions) {
  const { defaultWidth, maximumWidth, minimumWidth, reservedWidth, storageKey } = options;
  const getMaximum = useCallback(
    () => availableMaximum({ defaultWidth, maximumWidth, minimumWidth, reservedWidth, storageKey }),
    [defaultWidth, maximumWidth, minimumWidth, reservedWidth, storageKey],
  );
  const clamp = useCallback(
    (width: number) => Math.min(getMaximum(), Math.max(minimumWidth, width)),
    [getMaximum, minimumWidth],
  );
  const [panelWidth, setPanelWidthState] = useState(() => {
    if (typeof window === "undefined") return defaultWidth;
    try {
      const stored = Number.parseInt(localStorage.getItem(storageKey) ?? "", 10);
      return Number.isFinite(stored) ? clamp(stored) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });
  const [maximum, setMaximum] = useState(getMaximum);

  const setPanelWidth = useCallback(
    (width: number) => {
      const next = clamp(width);
      setPanelWidthState(next);
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Storage may be disabled; resizing still works for the current session.
      }
    },
    [clamp, storageKey],
  );

  useEffect(() => {
    const handleResize = () => {
      setMaximum(getMaximum());
      setPanelWidthState((width) => clamp(width));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clamp, getMaximum]);

  return { maximum, minimum: minimumWidth, panelWidth, setPanelWidth };
}

function clearDragStyles(): void {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

export function PanelResizeHandle({
  edge,
  label,
  maximum,
  minimum,
  panelWidth,
  className,
  onResize,
}: {
  edge: "left" | "right";
  label: string;
  maximum: number;
  minimum: number;
  panelWidth: number;
  className: string;
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
      className={`absolute inset-y-0 h-auto w-2 cursor-col-resize touch-none border-0 bg-transparent outline-none ${className}`}
      tabIndex={0}
      onKeyDown={(event) => {
        const direction = edge === "right" ? 1 : -1;
        if (event.key === "ArrowLeft") onResize(panelWidth - 24 * direction);
        else if (event.key === "ArrowRight") onResize(panelWidth + 24 * direction);
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
        const movement = event.clientX - dragStart.current.pointerX;
        onResize(dragStart.current.width + (edge === "right" ? movement : -movement));
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
