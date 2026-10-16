import type { HandSpec, SealGuide } from "./seal-guide";

// Right hand seen from the performer's side: fingers point up (-y), the wrist
// sits at the origin and the thumb is on the -x side. The left hand mirrors it.
const fingerX = [-13.5, -4.5, 4.5, 13.5];
const fingerLength = [30, 34, 30, 24];
const fingerNames = ["index", "middle", "ring", "little"] as const;
const palm = "M-17 0 L-20 -4 V-40 L-16 -44 H16 L20 -40 V-4 L17 0 Z";
const extended = (length: number) =>
  `M-4 0 V${-length + 3} L-2 ${-length} H2 L4 ${-length + 3} V0 Z`;
const curled = "M-4 12 V-7 L-2 -9 H2 L4 -7 V12 Z";
const thumbs = {
  up: { x: -22, y: -12, angle: 0, length: 24 },
  out: { x: -22, y: -12, angle: -38, length: 24 },
  cross: { x: -20, y: -14, angle: 62, length: 30 },
  down: { x: -16, y: -6, angle: 160, length: 22 },
  in: { x: -20, y: -18, angle: 90, length: 24 },
  raise: { x: -12, y: -22, angle: 0, length: 28 },
};
const frontThumbs = new Set(["cross", "in", "raise"]);
const labelGap = 40;
const fitSize = 230;

/** Centre and scale that fit every hand of a seal inside the reticle. */
function fit(guide: SealGuide) {
  const points = guide.hands.flatMap((hand) => {
    const a = ((hand.rotate ?? 0) * Math.PI) / 180;
    return [
      [-26, -78],
      [26, -78],
      [26, 4],
      [-26, 4],
    ].map(([x, y]) => [
      hand.x + x * Math.cos(a) - y * Math.sin(a),
      hand.y + x * Math.sin(a) + y * Math.cos(a),
    ]);
  });
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return {
    cx: (Math.max(...xs) + Math.min(...xs)) / 2,
    cy: (Math.max(...ys) + Math.min(...ys)) / 2,
    scale: Math.min(fitSize / width, fitSize / height, 3.2),
  };
}

/** Callouts in reticle units, with labels spread so they never overlap. */
export function layoutCallouts(guide: SealGuide) {
  const { cx, cy, scale } = fit(guide);
  const placed = guide.callouts.map((callout) => ({
    ...callout,
    x: (callout.at[0] - cx) * scale,
    y: (callout.at[1] - cy) * scale,
    labelY: (callout.at[1] - cy) * scale,
  }));
  for (const side of ["left", "right"]) {
    const column = placed
      .filter((c) => c.side === side)
      .sort((a, b) => a.y - b.y);
    column.forEach((c, i) => {
      if (i) c.labelY = Math.max(c.y, column[i - 1].labelY + labelGap);
    });
  }
  return placed;
}

export const labelTop = (labelY: number) => `${((200 + labelY) / 400) * 100}%`;

function Hand({ hand }: { hand: HandSpec }) {
  const focus = new Set(hand.focus);
  const thumb = thumbs[hand.thumb];
  const thumbShape = (
    <path
      className={focus.has("thumb") ? "focus" : ""}
      d={extended(thumb.length)}
      transform={`translate(${thumb.x} ${thumb.y}) rotate(${thumb.angle})`}
    />
  );
  const thumbInFront = frontThumbs.has(hand.thumb);
  const rotate = hand.rotate ?? 0;
  return (
    <g
      className="diagram-hand"
      transform={`translate(${hand.x} ${hand.y}) rotate(${rotate})`}
    >
      <g transform={hand.side === "L" ? "scale(-1 1)" : undefined}>
        {hand.fingers.map(
          (state, i) =>
            state === "up" && (
              <path
                key={i}
                className={focus.has(fingerNames[i]) ? "focus" : ""}
                d={extended(fingerLength[i])}
                transform={`translate(${fingerX[i]} -42) rotate(${hand.tilt?.[i] ?? 0})`}
              />
            ),
        )}
        {!thumbInFront && thumbShape}
        <path className="diagram-palm" d={palm} />
        {hand.fingers.map(
          (state, i) =>
            state === "curl" && (
              <path
                key={i}
                className={`curled ${focus.has(fingerNames[i]) ? "focus" : ""}`}
                d={curled}
                transform={`translate(${fingerX[i]} -42)`}
              />
            ),
        )}
        {thumbInFront && thumbShape}
      </g>
      <g transform={`translate(0 10) rotate(${-rotate})`}>
        <rect className="diagram-tag" x="-6" y="-6" width="12" height="12" />
        <text className="diagram-tag-text" textAnchor="middle" y="0.5">
          {hand.side}
        </text>
      </g>
    </g>
  );
}

export default function SealDiagram({ guide }: { guide: SealGuide }) {
  const { cx, cy, scale } = fit(guide);
  return (
    <g className="seal-diagram" transform="translate(200 200)">
      <g transform={`scale(${scale}) translate(${-cx} ${-cy})`}>
        {guide.hands.map((hand, i) => (
          <Hand key={i} hand={hand} />
        ))}
      </g>
      {layoutCallouts(guide).map(({ x, y, labelY, side }, i) => {
        const sign = side === "left" ? -1 : 1;
        return (
          <g className="diagram-callout" key={i}>
            <path
              d={`M${x} ${y} H${sign * 176} L${sign * 196} ${labelY} H${sign * 208}`}
            />
            <rect x={x - 3} y={y - 3} width="6" height="6" />
          </g>
        );
      })}
    </g>
  );
}
