import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { TrackingFrame } from "./useCamera";

export type Effect =
  | "fire"
  | "lightning"
  | "clones"
  | "eyes"
  | "pale-eyes"
  | "markings"
  | "water"
  | "chakra";
export function effectFor(
  id: string,
  nature: string[],
): { type: Effect; name: string } {
  if (id.includes("clone")) return { type: "clones", name: "Clone echoes" };
  if (id.includes("byakugan"))
    return { type: "pale-eyes", name: "Byakugan eyes" };
  if (id.includes("sharingan")) return { type: "eyes", name: "Sharingan eyes" };
  if (nature.includes("lightning") || id.includes("chidori"))
    return { type: "lightning", name: "Lightning chakra" };
  if (nature.includes("fire")) return { type: "fire", name: "Fire release" };
  if (nature.includes("water") || nature.includes("ice"))
    return { type: "water", name: "Water chakra" };
  if (id.includes("seal") || id.includes("sage"))
    return { type: "markings", name: "Chakra markings" };
  return { type: "chakra", name: "Chakra aura" };
}

function dummy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  box("#101f24", -62, 7, 124, 112);
  box("#263e42", -49, 19, 98, 88);
  box("#111d25", -37, 109, 30, 68);
  box("#111d25", 7, 109, 30, 68);
  box("#cd733f", -42, 25, 26, 60);
  box("#cd733f", 16, 25, 26, 60);
  box("#e7ac72", -19, 9, 38, 44);
  box("#e7ac72", -14, -54, 36, 55);
  box("#d6945f", -24, -44, 12, 30);
  box("#f2c994", -12, -43, 26, 32);
  box("#111d25", -29, -65, 56, 24);
  box("#111d25", -21, -73, 38, 16);
  box("#111d25", -31, -57, 12, 24);
  box("#111d25", 23, -58, 9, 36);
  box("#b64328", -28, -46, 57, 10);
  box("#afbbb2", -17, -46, 32, 10);
  box("#263e42", -5, -44, 8, 6);
  box("#111d25", -10, -29, 5, 4);
  box("#111d25", 11, -29, 5, 4);
  box("#9f563a", 0, -9, 11, 3);
  box("#e7ac72", -9, 39, 18, 33);
  box("#c3764d", -1, 40, 3, 30);
  box("#859889", -21, 95, 42, 12);
  ctx.restore();
}

export default function Stage({
  videoRef,
  tracking,
  live,
  mirrored,
  active,
  effect,
  reducedMotion,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  tracking: RefObject<TrackingFrame>;
  live: boolean;
  mirrored: boolean;
  active: boolean;
  effect: Effect;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let previous = 0;
    let drawn = false;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (now - previous < (reducedMotion ? 100 : 30)) return;
      previous = now;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(
        devicePixelRatio,
        1.5,
        1920 / Math.max(1, rect.width),
        1080 / Math.max(1, rect.height),
      );
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (
        drawn &&
        !live &&
        !active &&
        canvas.width === width &&
        canvas.height === height
      )
        return;
      drawn = true;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const w = width,
        h = height,
        time = reducedMotion ? 0 : now / 1000;
      const video = videoRef.current;
      const ready = live && video && video.readyState >= 2;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#142426";
      ctx.fillRect(0, 0, w, h);
      let offsetX = 0,
        offsetY = 0,
        vw = w,
        vh = h;
      if (ready) {
        const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
        vw = video.videoWidth * scale;
        vh = video.videoHeight * scale;
        offsetX = (w - vw) / 2;
        offsetY = (h - vh) / 2;
        ctx.save();
        if (mirrored) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, offsetX, offsetY, vw, vh);
        ctx.restore();
      } else {
        ctx.fillStyle = "#233437";
        ctx.beginPath();
        ctx.moveTo(0, h * 0.56);
        for (let i = 0; i <= 14; i++)
          ctx.lineTo((w * i) / 14, h * (0.38 + Math.sin(i * 4.6) * 0.09));
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();
        ctx.fillStyle = "#132225";
        for (let i = 0; i < 18; i++) {
          const x = (i * w) / 17,
            y = h * (0.3 + Math.sin(i * 2.3) * 0.1);
          ctx.fillRect(x - 2, y, 5, h * 0.5);
          ctx.beginPath();
          ctx.moveTo(x, y - h * 0.08);
          ctx.lineTo(x - w * 0.035, y + h * 0.23);
          ctx.lineTo(x + w * 0.035, y + h * 0.23);
          ctx.fill();
        }
        ctx.fillStyle = "#344340";
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
        ctx.strokeStyle = "#596052";
        ctx.lineWidth = 1;
        for (let i = -6; i < 7; i++) {
          ctx.beginPath();
          ctx.moveTo(w / 2 + i * 32, h * 0.78);
          ctx.lineTo(w / 2 + i * 170, h);
          ctx.stroke();
        }
        for (const y of [0.8, 0.85, 0.94]) {
          ctx.beginPath();
          ctx.moveTo(0, h * y);
          ctx.lineTo(w, h * y);
          ctx.stroke();
        }
        ctx.fillStyle = "#7e402d";
        ctx.fillRect(w * 0.12, h * 0.16, w * 0.025, h * 0.62);
        ctx.fillRect(w * 0.85, h * 0.16, w * 0.025, h * 0.62);
        ctx.fillStyle = "#a25337";
        ctx.fillRect(w * 0.07, h * 0.12, w * 0.86, h * 0.034);
        ctx.fillRect(w * 0.1, h * 0.23, w * 0.8, h * 0.024);
        ctx.fillStyle = "#182626";
        ctx.fillRect(w * 0.065, h * 0.1, w * 0.87, h * 0.022);
        if (active && effect === "clones") {
          ctx.globalAlpha = 0.48;
          dummy(ctx, w * 0.23, h * 0.48, h / 375);
          dummy(ctx, w * 0.77, h * 0.48, h / 375);
          ctx.globalAlpha = 1;
        }
        dummy(ctx, w / 2, h * 0.48, h / 330);
      }
      const project = (p: { x: number; y: number }) => ({
        x: mirrored ? w - (offsetX + p.x * vw) : offsetX + p.x * vw,
        y: offsetY + p.y * vh,
      });
      if (live) {
        ctx.strokeStyle = "#e3c266";
        ctx.fillStyle = "#ffdc86";
        ctx.lineWidth = 1.3 * dpr;
        for (const hand of tracking.current.hands) {
          for (const chain of [
            [0, 1, 2, 3, 4],
            [0, 5, 6, 7, 8],
            [5, 9, 10, 11, 12],
            [9, 13, 14, 15, 16],
            [13, 17, 18, 19, 20],
            [0, 17],
          ]) {
            ctx.beginPath();
            chain.forEach((index, i) => {
              const p = project(hand[index]);
              if (i === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
          }
          for (const point of hand) {
            const p = project(point);
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
          }
        }
      }
      if (active) {
        const color =
          effect === "fire"
            ? "#ff9345"
            : effect === "water"
              ? "#73c8dc"
              : effect === "lightning"
                ? "#c7deff"
                : "#e5cc70";
        if (effect === "clones" && ready) {
          ctx.save();
          ctx.globalAlpha = 0.32;
          if (mirrored) {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, offsetX - w * 0.28, offsetY, vw, vh);
          ctx.drawImage(video, offsetX + w * 0.28, offsetY, vw, vh);
          ctx.restore();
        } else if (
          effect === "eyes" ||
          effect === "pale-eyes" ||
          effect === "markings"
        ) {
          const face = tracking.current.face;
          const eyes = ready
            ? face.length > 474
              ? [project(face[468]), project(face[473])]
              : []
            : [
                { x: w / 2 - (7 * h) / 330, y: h * 0.48 - (27 * h) / 330 },
                { x: w / 2 + (14 * h) / 330, y: h * 0.48 - (27 * h) / 330 },
              ];
          const radius =
            eyes.length === 2
              ? Math.max(3 * dpr, Math.abs(eyes[1].x - eyes[0].x) * 0.1)
              : 0;
          for (const eye of eyes) {
            ctx.fillStyle =
              effect === "pale-eyes"
                ? "#eee8ff"
                : effect === "eyes"
                  ? "#e44c39"
                  : "#e89c3f";
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.ellipse(eye.x, eye.y, radius, radius * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = effect === "pale-eyes" ? "#c5bbd9" : "#1b161a";
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, radius * 0.33, 0, Math.PI * 2);
            ctx.fill();
            if (effect === "markings") {
              ctx.strokeStyle = "#e58b34";
              ctx.lineWidth = 3 * dpr;
              for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(eye.x - radius * 2, eye.y + radius * (3 + i));
                ctx.lineTo(eye.x + radius * 2, eye.y + radius * (3.5 + i));
                ctx.stroke();
              }
            }
          }
          if (ready && !eyes.length) {
            ctx.fillStyle = "#f4e2bd";
            ctx.font = `${13 * dpr}px monospace`;
            ctx.fillText(
              "FACE EFFECT · LOOK TOWARD CAMERA",
              18 * dpr,
              h - 26 * dpr,
            );
          }
        } else {
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          const particleCount = reducedMotion ? 14 : 42;
          for (let i = 0; i < particleCount; i++) {
            const a = i * 2.399 + time * 0.25;
            const radius = 0.23 + 0.04 * Math.sin(i * 4 + time * 2);
            const x = w / 2 + Math.cos(a) * w * radius;
            const y = h * 0.54 + Math.sin(a) * h * 0.38;
            ctx.globalAlpha = 0.45 + 0.5 * Math.sin(i + time) ** 2;
            ctx.fillRect(
              x,
              y,
              (2 + (i % 3)) * dpr,
              (effect === "fire" ? 8 : 3) * dpr,
            );
          }
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = 2 * dpr;
          for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            for (let i = 0; i <= 20; i++) {
              const y = h * (0.18 + i * 0.035);
              const x =
                w / 2 +
                side *
                  w *
                  (0.19 +
                    Math.sin(i * 1.7 + time * 4) *
                      (effect === "lightning" ? 0.07 : 0.02)) *
                  Math.sin((i / 20) * Math.PI);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      if (!ready) {
        ctx.fillStyle = "#070e0d18";
        for (let y = 0; y < h; y += 4 * dpr) ctx.fillRect(0, y, w, dpr);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, tracking, live, mirrored, active, effect, reducedMotion]);
  return (
    <div
      className="runtime-stage"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#142426",
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={canvasRef}
        data-testid="effect-stage"
        data-effect={active ? effect : "none"}
        aria-label={
          live
            ? "Live camera with local visual effects"
            : "Illustrated practice scene; not a camera feed"
        }
        role="img"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
