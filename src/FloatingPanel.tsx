import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import Icon from "./Icon";
import "./panel.css";
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
const key = "naruto-ninja.panel.v1";
function constrain(box: Box): Box {
  const maxHeight = Math.min(
    innerHeight - 158,
    innerWidth <= 640 && innerHeight < 760 ? innerHeight * 0.4 : Infinity,
  );
  const width = Math.max(
    Math.min(288, innerWidth - 24),
    Math.min(box.width, innerWidth - 24),
  );
  const height = Math.max(
    Math.min(220, maxHeight),
    Math.min(box.height, maxHeight),
  );
  return {
    width,
    height,
    x: Math.max(12, Math.min(box.x, innerWidth - width - 12)),
    y: Math.max(64, Math.min(box.y, innerHeight - height - 86)),
  };
}
function initial(): Box {
  const { width, height } = constrain({
    x: 12,
    y: 64,
    width: 480,
    height: 320,
  });
  return constrain({
    x: innerWidth - width - 24,
    y: innerHeight - height - 86,
    width,
    height,
  });
}
function load(): Box {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      value &&
      ["x", "y", "width", "height"].every(
        (k) => typeof value[k] === "number" && Number.isFinite(value[k]),
      )
    )
      return constrain(value);
  } catch {}
  return initial();
}
export default function FloatingPanel({
  title,
  jp,
  children,
  footer,
}: {
  title: string;
  jp?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [box, setBox] = useState<Box>(load);
  const drag = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    box: Box;
  } | null>(null);
  const update = (next: Box) => {
    const clamped = constrain(next);
    setBox(clamped);
    try {
      localStorage.setItem(key, JSON.stringify(clamped));
    } catch {}
  };
  useEffect(() => {
    const resize = () => setBox((current) => constrain(current));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const start = (
    event: PointerEvent<HTMLButtonElement>,
    mode: "move" | "resize",
  ) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode, startX: event.clientX, startY: event.clientY, box };
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.startX,
      dy = event.clientY - current.startY;
    update(
      current.mode === "move"
        ? { ...current.box, x: current.box.x + dx, y: current.box.y + dy }
        : {
            ...current.box,
            width: current.box.width + dx,
            height: current.box.height + dy,
          },
    );
  };
  const keyboard = (event: KeyboardEvent, mode: "move" | "resize") => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const step = event.shiftKey ? 50 : 10;
    const dx =
      event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy =
      event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    update(
      mode === "move"
        ? { ...box, x: box.x + dx, y: box.y + dy }
        : { ...box, width: box.width + dx, height: box.height + dy },
    );
  };
  return (
    <section
      className="floating-panel"
      aria-label="Movable hand sequence"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    >
      <header className="floating-panel-bar">
        <button
          className="panel-move"
          aria-label={`Move sequence panel: ${title}`}
          title="Drag to move. Arrow keys move; Shift moves faster."
          onPointerDown={(e) => start(e, "move")}
          onPointerMove={move}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => keyboard(e, "move")}
        >
          <span className="panel-grip" aria-hidden="true" />
          {jp && (
            <span className="panel-jp" aria-hidden="true">
              {jp}
            </span>
          )}
          {title}
        </button>
        <button
          className="panel-reset"
          aria-label="Reset panel position and size"
          title="Reset panel position and size"
          onClick={() => update(initial())}
        >
          <Icon name="reset" />
        </button>
      </header>
      <div className="floating-panel-content">{children}</div>
      <div className="panel-hint">
        {footer ?? "Drag title · resize corner · scroll for more"}
      </div>
      <button
        className="panel-resize"
        aria-label="Resize sequence panel"
        title="Drag to resize. Arrow keys resize; Shift changes faster."
        onPointerDown={(e) => start(e, "resize")}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => keyboard(e, "resize")}
      >
        <span aria-hidden="true" />
      </button>
    </section>
  );
}
