import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactElement } from "react";
import { blend, euler, handPoints } from "./pose/hand";
import type { Digit, Side, Vec } from "./pose/hand";
import { OPEN, sealPoses } from "./pose/seals";

const bones: [number, number, Digit | "palm"][] = [
  [0, 1, "thumb"],
  [1, 2, "thumb"],
  [2, 3, "thumb"],
  [3, 4, "thumb"],
  [5, 6, "index"],
  [6, 7, "index"],
  [7, 8, "index"],
  [9, 10, "middle"],
  [10, 11, "middle"],
  [11, 12, "middle"],
  [13, 14, "ring"],
  [14, 15, "ring"],
  [15, 16, "ring"],
  [17, 18, "little"],
  [18, 19, "little"],
  [19, 20, "little"],
];
const palm = [0, 1, 5, 9, 13, 17];
const width: Record<Digit | "palm", number> = {
  thumb: 19,
  index: 16,
  middle: 16.5,
  ring: 15.5,
  little: 13.5,
  palm: 0,
};
// Loop: hold open, form the seal, hold it.
const cycle = 4.4;
const openFor = 0.7;
const formFor = 1.3;
const ease = (t: number) => 1 - (1 - t) ** 3;
const defaultView = { yaw: 0, pitch: -12 };

/**
 * Animated 3D model of both hands forming a seal, drawn into the 400×400
 * reticle. Drag or use the arrow keys to turn it. Digits listed in `issues`
 * (e.g. "L:index") are drawn in red.
 */
// Each hand has its own colour so crossed or interlaced fingers can be told apart.
const hand: Record<Side, string> = { L: "left", R: "right" };

export default function HandFigure({
  sealId,
  still,
  issues,
  label,
  start = defaultView,
}: {
  sealId: string;
  still: boolean;
  issues?: Set<string>;
  label: string;
  /** Initial camera angle, degrees. */
  start?: { yaw: number; pitch: number };
}) {
  const seal = sealPoses[sealId];
  const [phase, setPhase] = useState(still ? 1 : 0);
  const [view, setView] = useState(start);
  const drag = useRef<{
    x: number;
    y: number;
    yaw: number;
    pitch: number;
  } | null>(null);
  useEffect(() => {
    setView(start);
    if (still) {
      setPhase(1);
      return;
    }
    const began = performance.now();
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 33 || document.hidden) return;
      last = now;
      const t = ((now - began) / 1000) % cycle;
      setPhase(t < openFor ? 0 : ease(Math.min(1, (t - openFor) / formFor)));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [sealId, still]);
  if (!seal) return null;

  // Fit the finished seal, so the figure does not zoom while it animates.
  const final = [...handPoints("L", seal.L), ...handPoints("R", seal.R)];
  const centre = final
    .reduce<Vec>(
      (sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]],
      [0, 0, 0],
    )
    .map((v) => v / final.length) as Vec;
  const radius = Math.max(
    ...final.map((p) =>
      Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]),
    ),
  );
  const scale = 112 / (radius + 12);
  const project = (p: Vec) => {
    const v = euler(
      [p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]],
      [view.pitch, view.yaw, 0],
    );
    return { x: 200 + v[0] * scale, y: 200 - v[1] * scale, z: v[2] };
  };

  const items: { z: number; node: ReactElement }[] = [];
  const tags: ReactElement[] = [];
  (["L", "R"] as Side[]).forEach((side) => {
    const pose = blend(OPEN[side], seal[side], phase);
    const points = handPoints(side, pose).map(project);
    const palmPoints = palm.map((i) => points[i]);
    items.push({
      z: palmPoints.reduce((sum, p) => sum + p.z, 0) / palmPoints.length - 6,
      node: (
        <polygon
          key={`${side}-palm`}
          className={`figure-palm ${hand[side]}`}
          points={palmPoints.map((p) => `${p.x},${p.y}`).join(" ")}
        />
      ),
    });
    bones.forEach(([a, b, digit]) => {
      const p = points[a];
      const q = points[b];
      const w = width[digit] * scale;
      const issue = issues?.has(`${side}:${digit}`);
      items.push({
        z: (p.z + q.z) / 2,
        node: (
          <g
            key={`${side}-${a}-${b}`}
            className={`figure-bone ${hand[side]} ${issue ? "issue" : ""}`}
          >
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={w} />
            <line
              className="figure-core"
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              strokeWidth={Math.max(1, w - 2.6)}
            />
            <circle cx={q.x} cy={q.y} r={Math.max(1.2, w * 0.18)} />
          </g>
        ),
      });
    });
    const wrist = points[0];
    tags.push(
      <g key={`${side}-tag`} className={`figure-tag ${hand[side]}`}>
        <rect x={wrist.x - 7} y={wrist.y + 6} width="14" height="14" />
        <text x={wrist.x} y={wrist.y + 13.5} textAnchor="middle">
          {side}
        </text>
      </g>,
    );
  });
  items.sort((a, b) => a.z - b.z);

  const begin = (event: PointerEvent<SVGCircleElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ...view };
  };
  const move = (event: PointerEvent<SVGCircleElement>) => {
    const d = drag.current;
    if (!d) return;
    setView({
      yaw: d.yaw + (event.clientX - d.x) * 0.6,
      pitch: Math.max(-80, Math.min(80, d.pitch + (event.clientY - d.y) * 0.6)),
    });
  };
  const keys = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 30 : 10;
    const turn: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key === "Home") setView(start);
    else if (turn[event.key])
      setView({
        yaw: view.yaw + turn[event.key][0],
        pitch: Math.max(-80, Math.min(80, view.pitch + turn[event.key][1])),
      });
    else return;
    event.preventDefault();
  };
  return (
    <g className="hand-figure">
      <g aria-hidden="true">
        {items.map((item) => item.node)}
        {tags}
      </g>
      <circle
        className="figure-handle"
        cx="200"
        cy="200"
        r="150"
        tabIndex={0}
        role="img"
        aria-label={`${label}. Drag or use the arrow keys to turn the model; Home resets it.`}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => setView(start)}
        onKeyDown={keys}
      />
    </g>
  );
}
