import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { AppModel } from "./app-model";
import SealDiagram, { labelTop, layoutCallouts } from "./SealDiagram";
import { sealGuides } from "./seal-guide";
import { glyphFor } from "./seals";

const cross = [0, 90, 180, 270];

export default function TrainingSeal({ model }: { model: AppModel }) {
  const root = useRef<HTMLDivElement>(null);
  const angle = useRef({ value: 0 });
  useEffect(() => {
    if (model.reducedMotion || model.cameraStatus === "live") return;
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
  }, [model.reducedMotion, model.cameraStatus]);
  useEffect(() => {
    const tween = gsap.to(angle.current, {
      value: model.progress * 3,
      duration: model.reducedMotion ? 0 : 0.6,
      ease: "power3.out",
    });
    return () => {
      tween.kill();
    };
  }, [model.progress, model.reducedMotion]);
  if (model.cameraStatus === "live") return null;
  const steps = model.sequence.length
    ? model.sequence
    : [{ id: "seal", name: "Preview" }];
  const compact = steps.length > 16;
  const markerRadius = Math.min(17, 500 / steps.length);
  const current = model.sequence[model.progress];
  const guide =
    !model.activeEffect && current ? sealGuides[current.id] : undefined;
  return (
    <div
      className={`training-seal ${model.activeEffect ? "charged" : ""}`}
      ref={root}
      data-progress={model.progress}
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 400" fill="none">
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
          strokeDasharray={`${model.sequence.length ? (model.progress / model.sequence.length) * 100 : 0} 100`}
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
        <g className="seal-orbit">
          {steps.map((seal, index) => {
            const angle = (index / steps.length) * Math.PI * 2 - Math.PI / 2;
            const x = 200 + Math.cos(angle) * 188;
            const y = 200 + Math.sin(angle) * 188;
            const r = compact
              ? index === model.progress
                ? 17
                : 3
              : markerRadius;
            return (
              <g
                key={`${index}-${seal.id}`}
                className={
                  index < model.progress
                    ? "accepted"
                    : index === model.progress
                      ? "next"
                      : ""
                }
              >
                <rect x={x - r} y={y - r} width={r * 2} height={r * 2} />
                {(!compact || index === model.progress) && (
                  <text
                    x={x}
                    y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
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
        {guide && <SealDiagram guide={guide} />}
      </svg>
      {(guide ? layoutCallouts(guide) : []).map((callout, i) => (
        <span
          key={`${current.id}-${i}`}
          className={`callout-label callout-${callout.side}`}
          style={{ top: labelTop(callout.labelY) }}
        >
          {callout.text}
        </span>
      ))}
      <span className="seal-caption">
        {guide
          ? `${glyphFor(current.id)} ${current.name} · your view · simplified diagram`
          : "TARGET · original practice figure, not a pose reference"}
      </span>
    </div>
  );
}
