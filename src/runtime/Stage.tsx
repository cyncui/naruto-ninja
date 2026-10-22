import { useEffect, useRef } from "react";
import { gsap } from "gsap";
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

const phosphor: Record<string, string> = {
  "#202b36": "#4a2204",
  "#f46b2c": "#ff8a1e",
  "#ecb990": "#c96a12",
  "#f3caa8": "#e07a16",
  "#e6e8e0": "#ffc46b",
  "#9f7054": "#1c0d02",
};
const tint = (color: string) => phosphor[color] ?? color;

function dummy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const shape = (color: string, path: string) => {
    ctx.fillStyle = tint(color);
    ctx.fill(new Path2D(path));
  };
  shape(
    "#202b36",
    "M-45 64L-55 140Q-42 150-24 141L-8 91 10 91 27 143Q41 150 55 139L44 62Z",
  );
  shape(
    "#f46b2c",
    "M-25-3Q-46 0-58 27L-71 76Q-63 91-48 80L-34 43-36 79Q0 92 37 79L34 43 50 80Q65 91 73 76L59 25Q48 0 24-3Z",
  );
  shape("#202b36", "M-17-3L-11 24 0 38 12 24 17-3 24-3 26 66-26 66-24-3Z");
  shape("#ecb990", "M-12-19L-13 6Q0 22 14 6L13-19Z");
  shape("#ecb990", "M-29-70Q-39-54-30-28L-17-10Q0 3 18-10L31-28Q41-56 25-71Z");
  shape(
    "#202b36",
    "M-33-48L-45-61-34-65-43-82-23-76-21-98-8-83 6-103 15-83 35-93 29-75 45-70 32-58 33-45 23-55-23-55Z",
  );
  shape("#202b36", "M-35-59L36-59 33-42-32-42Z");
  shape("#e6e8e0", "M-20-57L21-57 20-44-19-44Z");
  ctx.strokeStyle = tint("#202b36");
  ctx.lineWidth = 1.8;
  ctx.stroke(new Path2D("M-5-48Q-12-55-2-54Q6-51 0-47Q-6-44-6-50L-10-46"));
  ctx.stroke(new Path2D("M-20-30L-10-29M10-29L20-30M-6-16Q0-12 6-16"));
  shape("#ecb990", "M-49 57L-29 35-10 27-5 35-19 47-12 55-37 73Z");
  shape(
    "#f3caa8",
    "M49 58L29 34 12 19 8 3Q2-3 0 4L1 24-8 5Q-14 0-15 8L-9 36 11 56 37 73Z",
  );
  ctx.strokeStyle = tint("#9f7054");
  ctx.lineWidth = 1.3;
  ctx.stroke(new Path2D("M1 24L7 37M-9 36L-2 42M12 19L15 36"));
  shape("#e6e8e0", "M-35 69Q0 78 36 69L37 78Q0 88-36 78Z");
  shape("#202b36", "M-10 73H11V84H-10Z");
  shape(
    "#e6e8e0",
    "M-51 126L-26 131-28 136-52 132ZM29 130L53 125 54 131 30 136Z",
  );
  ctx.restore();
}

const HAND_CHAINS = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16],
  [13, 17, 18, 19, 20],
  [0, 17],
];
const auraColor: Partial<Record<Effect, string>> = {
  fire: "#ff9345",
  water: "#73c8dc",
  lightning: "#c7deff",
};
const eyeColor: Partial<Record<Effect, string>> = {
  "pale-eyes": "#eee8ff",
  eyes: "#e44c39",
};

type Point = { x: number; y: number };
/** Canvas size plus where the cover-fitted video sits inside it. */
interface Frame {
  w: number;
  h: number;
  dpr: number;
  offsetX: number;
  offsetY: number;
  vw: number;
  vh: number;
  mirrored: boolean;
}
/** Where the illustrated practice figure stands, by viewport shape. */
interface Demo {
  x: number;
  y: number;
  scale: number;
}

function demoLayout(rect: DOMRect, w: number, h: number, dpr: number): Demo {
  const short = rect.height <= 760;
  if (rect.width <= 640)
    return {
      x: w * 0.5,
      y: h * (short ? 0.345 : 0.37),
      scale:
        (short
          ? Math.min(w * 0.58, h * 0.22)
          : Math.min(w * 0.65, h * 0.24, 280 * dpr)) / 350,
    };
  if (rect.width > 1000 && short)
    return {
      x: w * 0.48,
      y: h * 0.38,
      scale: Math.min(w * 0.28, h * 0.32, 280 * dpr) / 350,
    };
  return {
    x: w * 0.64,
    y: h * 0.32,
    scale: Math.min(w * 0.48, h * 0.38, 480 * dpr) / 350,
  };
}

function drawVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  frame: Frame,
  shifts: number[],
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (frame.mirrored) {
    ctx.translate(frame.w, 0);
    ctx.scale(-1, 1);
  }
  for (const shift of shifts)
    ctx.drawImage(
      video,
      frame.offsetX + shift,
      frame.offsetY,
      frame.vw,
      frame.vh,
    );
  ctx.restore();
}

function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: Point[][],
  project: (p: Point) => Point,
  dpr: number,
) {
  ctx.strokeStyle = "#5dff8f";
  ctx.fillStyle = "#ffb347";
  ctx.lineWidth = 1.3 * dpr;
  for (const hand of hands) {
    for (const chain of HAND_CHAINS) {
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

function drawEyes(
  ctx: CanvasRenderingContext2D,
  eyes: Point[],
  effect: Effect,
  dpr: number,
) {
  const radius =
    eyes.length === 2
      ? Math.max(3 * dpr, Math.abs(eyes[1].x - eyes[0].x) * 0.1)
      : 0;
  for (const eye of eyes) {
    ctx.fillStyle = eyeColor[effect] ?? "#e89c3f";
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
    if (effect !== "markings") continue;
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

/** Where the aura is centred and how far it spreads. */
interface Field {
  x: number;
  y: number;
  width: number;
  height: number;
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  field: Field,
  effect: Effect,
  time: number,
  count: number,
  dpr: number,
) {
  for (let i = 0; i < count; i++) {
    const a = i * 2.399 + time * 0.25;
    const radius = 0.23 + 0.04 * Math.sin(i * 4 + time * 2);
    const x = field.x + Math.cos(a) * field.width * radius;
    const y = field.y + Math.sin(a) * field.height * 0.38;
    ctx.globalAlpha = 0.45 + 0.5 * Math.sin(i + time) ** 2;
    ctx.fillRect(x, y, (2 + (i % 3)) * dpr, (effect === "fire" ? 8 : 3) * dpr);
  }
}

/** Two flickering strokes either side of the body; `rowY` places each row. */
function drawOutline(
  ctx: CanvasRenderingContext2D,
  field: Field,
  wobble: number,
  time: number,
  rowY: (i: number) => number,
) {
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const x =
        field.x +
        side *
          field.width *
          (0.19 + Math.sin(i * 1.7 + time * 4) * wobble) *
          Math.sin((i / 20) * Math.PI);
      if (i === 0) ctx.moveTo(x, rowY(i));
      else ctx.lineTo(x, rowY(i));
    }
    ctx.stroke();
  }
}

/** Orbiting particles and two flickering outline strokes. */
function drawAura(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  demo: Demo,
  ready: boolean,
  effect: Effect,
  time: number,
  reducedMotion: boolean,
) {
  const { h, dpr } = frame;
  const color = auraColor[effect] ?? "#e5cc70";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const field: Field = ready
    ? { x: frame.w / 2, y: h * 0.54, width: frame.w, height: h }
    : {
        x: demo.x,
        y: demo.y,
        width: demo.scale * 700,
        height: demo.scale * 455,
      };
  drawParticles(ctx, field, effect, time, reducedMotion ? 14 : 42, dpr);
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2 * dpr;
  drawOutline(
    ctx,
    field,
    effect === "lightning" ? 0.07 : 0.02,
    time,
    ready
      ? (i) => h * (0.18 + i * 0.035)
      : (i) => demo.y + demo.scale * 350 * (-0.55 + i * 0.055),
  );
  ctx.globalAlpha = 1;
}

/** Cover-fits the video into the canvas, or fills the canvas when there is none. */
function fitFrame(
  w: number,
  h: number,
  dpr: number,
  mirrored: boolean,
  video: HTMLVideoElement | null,
): Frame {
  if (!video)
    return { w, h, dpr, offsetX: 0, offsetY: 0, vw: w, vh: h, mirrored };
  const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
  const vw = video.videoWidth * scale;
  const vh = video.videoHeight * scale;
  return {
    w,
    h,
    dpr,
    offsetX: (w - vw) / 2,
    offsetY: (h - vh) / 2,
    vw,
    vh,
    mirrored,
  };
}

function eyePositions(
  demo: Demo,
  face: Point[] | null,
  project: (p: Point) => Point,
) {
  if (!face)
    return [
      { x: demo.x - 15 * demo.scale, y: demo.y - 44 * demo.scale },
      { x: demo.x + 15 * demo.scale, y: demo.y - 44 * demo.scale },
    ];
  return face.length > 474 ? [project(face[468]), project(face[473])] : [];
}

/** The active technique's overlay, on the video when `video` is set or on the figure. */
function drawEffect(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  demo: Demo,
  video: HTMLVideoElement | null,
  tracking: TrackingFrame,
  effect: Effect,
  time: number,
  reducedMotion: boolean,
) {
  const ready = video !== null;
  if (effect === "clones" && video) {
    drawVideo(ctx, video, frame, [-frame.w * 0.28, frame.w * 0.28], 0.32);
    return;
  }
  if (effect !== "eyes" && effect !== "pale-eyes" && effect !== "markings") {
    drawAura(ctx, frame, demo, ready, effect, time, reducedMotion);
    return;
  }
  const project = projector(frame);
  const eyes = eyePositions(demo, ready ? tracking.face : null, project);
  drawEyes(ctx, eyes, effect, frame.dpr);
  if (ready && !eyes.length) {
    const { dpr } = frame;
    ctx.fillStyle = "#ffb347";
    ctx.font = `${13 * dpr}px Readout, monospace`;
    ctx.fillText(
      "FACE EFFECT · LOOK TOWARD CAMERA",
      18 * dpr,
      frame.h - 26 * dpr,
    );
  }
}

/** Maps a normalized landmark onto the canvas, matching the drawn video. */
const projector = (frame: Frame) => (p: Point) => ({
  x: frame.mirrored
    ? frame.w - (frame.offsetX + p.x * frame.vw)
    : frame.offsetX + p.x * frame.vw,
  y: frame.offsetY + p.y * frame.vh,
});

/** Backing-store size: device pixels, capped at 1.5× and at 1920×1080. */
function canvasSize(rect: DOMRect) {
  const dpr = Math.min(
    devicePixelRatio,
    1.5,
    1920 / Math.max(1, rect.width),
    1080 / Math.max(1, rect.height),
  );
  return {
    dpr,
    width: Math.max(1, Math.round(rect.width * dpr)),
    height: Math.max(1, Math.round(rect.height * dpr)),
  };
}

/** The practice figure, flanked by two faint echoes for the clones effect. */
function drawFigure(
  ctx: CanvasRenderingContext2D,
  demo: Demo,
  echoes: boolean,
) {
  if (echoes) {
    ctx.globalAlpha = 0.25;
    const echo = (demo.scale * 350) / 420;
    dummy(ctx, demo.x - demo.scale * 112, demo.y, echo);
    dummy(ctx, demo.x + demo.scale * 112, demo.y, echo);
    ctx.globalAlpha = 1;
  }
  dummy(ctx, demo.x, demo.y - demo.scale * 14, demo.scale);
}

export default function Stage({
  videoRef,
  tracking,
  live,
  mirrored,
  active,
  effect,
  reducedMotion,
  figure,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  tracking: RefObject<TrackingFrame>;
  live: boolean;
  mirrored: boolean;
  active: boolean;
  effect: Effect;
  reducedMotion: boolean;
  /** Draw the practice figure when the camera is off. */
  figure: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let previous = -Infinity;
    let drawn = false;
    const paint = (rect: DOMRect, dpr: number, time: number) => {
      const { width: w, height: h } = canvas;
      const demo = demoLayout(rect, w, h, dpr);
      const video = videoRef.current;
      const source = live && video && video.readyState >= 2 ? video : null;
      const frame = fitFrame(w, h, dpr, mirrored, source);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      if (source) drawVideo(ctx, source, frame, [0]);
      else if (figure) drawFigure(ctx, demo, active && effect === "clones");
      if (live) drawHands(ctx, tracking.current.hands, projector(frame), dpr);
      if (active)
        drawEffect(
          ctx,
          frame,
          demo,
          source,
          tracking.current,
          effect,
          time,
          reducedMotion,
        );
    };
    const draw = (seconds: number) => {
      const now = seconds * 1000;
      if (document.hidden || now - previous < (reducedMotion ? 100 : 30))
        return;
      previous = now;
      const rect = canvas.getBoundingClientRect();
      const { dpr, width, height } = canvasSize(rect);
      const sized = canvas.width === width && canvas.height === height;
      if (drawn && !live && !active && sized) return;
      drawn = true;
      if (!sized) {
        canvas.width = width;
        canvas.height = height;
      }
      paint(rect, dpr, reducedMotion ? 0 : seconds);
    };
    draw(0);
    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  }, [
    videoRef,
    tracking,
    live,
    mirrored,
    active,
    effect,
    reducedMotion,
    figure,
  ]);
  return (
    <div
      className="runtime-stage"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#050505",
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
