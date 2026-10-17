import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { gsap } from "gsap";
import HandFigure from "./HandFigure";
import { glyphFor } from "./seals";

const cross = [0, 90, 180, 270];
export type MarkerState = "accepted" | "next" | "right" | "wrong" | "";
interface RingSeal {
  id: string;
  name: string;
}

/**
 * The targeting reticle: seal markers on a ring, a progress arc and an
 * animated 3D hand model in the centre. Markers become buttons when `onPick`
 * is set.
 */
export default function SealRing({
  seals,
  stateOf,
  focusIndex,
  progress,
  turns,
  figure,
  caption,
  charged = false,
  still = false,
  onPick,
  pickLabel,
  className = "",
  dataProgress,
}: {
  seals: RingSeal[];
  stateOf: (index: number) => MarkerState;
  /** Marker kept large and labelled when the ring is crowded. */
  focusIndex: number;
  /** Fraction of the progress arc to fill. */
  progress: number;
  /** Steps taken; each eases the ring round a few degrees. */
  turns: number;
  /** Seal shown on the hand model, with digits to mark as wrong. */
  figure?: {
    sealId: string;
    issues?: Set<string>;
    label: string;
    /** Hold the model at the finished seal (reduced motion). */
    still?: boolean;
  };
  caption: ReactNode;
  charged?: boolean;
  /** Hold the ring and model still (reduced motion or live camera). */
  still?: boolean;
  onPick?: (seal: RingSeal, index: number) => void;
  pickLabel?: (seal: RingSeal, index: number) => string;
  className?: string;
  dataProgress?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const angle = useRef({ value: 0 });
  // Idle sway; clickable markers hold still so they are easy to hit.
  const sway = !still && !onPick;
  useEffect(() => {
    if (!sway) return;
    const context = gsap.context(() => {
      const ring = root.current?.querySelector(".seal-orbit");
      const tick = (time: number) => {
        if (document.hidden || !ring) return;
        gsap.set(ring, {
          rotation: angle.current.value + Math.sin(time * 0.45) * 1.5,
          svgOrigin: "200 200",
        });
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    }, root);
    return () => context.revert();
  }, [sway]);
  useEffect(() => {
    const tween = gsap.to(angle.current, {
      value: turns * 3,
      duration: still ? 0 : 0.6,
      ease: "power3.out",
    });
    return () => {
      tween.kill();
    };
  }, [turns, still]);
  const compact = seals.length > 16;
  const markerRadius = Math.min(17, 500 / seals.length);
  const pick = (seal: RingSeal, index: number) => onPick?.(seal, index);
  const keyPick = (event: KeyboardEvent, seal: RingSeal, index: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    pick(seal, index);
  };
  return (
    <div
      className={`training-seal ${charged ? "charged" : ""} ${onPick ? "pickable" : ""} ${className}`}
      ref={root}
      data-progress={dataProgress}
      role={onPick ? "group" : undefined}
      aria-label={onPick ? "Seal ring" : undefined}
      aria-hidden={onPick ? undefined : true}
    >
      <svg viewBox="0 0 400 400" fill="none">
        <g aria-hidden="true">
          <circle
            className="seal-ticks"
            cx="200"
            cy="200"
            r="199"
            pathLength="360"
          />
          <circle className="seal-track" cx="200" cy="200" r="188" />
          <circle
            className="seal-progress"
            cx="200"
            cy="200"
            r="188"
            pathLength="100"
            strokeDasharray={`${progress * 100} 100`}
            transform="rotate(-90 200 200)"
          />
          <circle className="seal-inner" cx="200" cy="200" r="150" />
          {cross.map((turn) => (
            <line
              key={turn}
              className="seal-cross"
              x1="200"
              y1="38"
              x2="200"
              y2="58"
              transform={`rotate(${turn} 200 200)`}
            />
          ))}
        </g>
        <g className="seal-orbit">
          {seals.map((seal, index) => {
            const turn = (index / seals.length) * Math.PI * 2 - Math.PI / 2;
            const x = 200 + Math.cos(turn) * 188;
            const y = 200 + Math.sin(turn) * 188;
            const r = compact ? (index === focusIndex ? 17 : 3) : markerRadius;
            return (
              <g
                key={`${index}-${seal.id}`}
                className={stateOf(index)}
                role={onPick ? "button" : undefined}
                tabIndex={onPick ? 0 : undefined}
                aria-label={onPick ? pickLabel?.(seal, index) : undefined}
                onClick={onPick ? () => pick(seal, index) : undefined}
                onKeyDown={
                  onPick ? (event) => keyPick(event, seal, index) : undefined
                }
              >
                <rect x={x - r} y={y - r} width={r * 2} height={r * 2} />
                {(!compact || index === focusIndex) && (
                  <text
                    x={x}
                    y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    aria-hidden="true"
                    style={{
                      fontSize: compact
                        ? 20
                        : Math.min(20, markerRadius * 1.15),
                    }}
                  >
                    {glyphFor(seal.id)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        {figure && (
          <HandFigure
            key={figure.sealId}
            sealId={figure.sealId}
            still={figure.still ?? still}
            issues={figure.issues}
            label={figure.label}
          />
        )}
      </svg>
      <div className="seal-caption">{caption}</div>
    </div>
  );
}
