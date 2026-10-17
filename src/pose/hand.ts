// An articulated hand in MediaPipe's 21-landmark layout, so the same points
// drive the 3D figure and the comparison with the camera's landmarks.
//
// World space: x = the performer's right, y = up, z = toward the camera.
// A right hand in its canonical pose has fingers along +y, the palm facing
// +z (toward the camera) and the thumb on the −x side. Left hands mirror x.

export type Vec = [number, number, number];
export type Side = "L" | "R";
export const FINGERS = ["index", "middle", "ring", "little"] as const;
export type Finger = (typeof FINGERS)[number];
export type Digit = Finger | "thumb";

export interface ThumbPose {
  /** Angle from the index finger's direction out toward the thumb side, degrees. */
  spread: number;
  /** Lift out of the palm plane toward the palm side, degrees. */
  lift: number;
  /** 0 straight, 1 fully bent at both thumb joints. */
  curl: number;
}
export interface HandPose {
  /** Wrist position in millimetres. */
  at: Vec;
  /** Euler rotation applied to the canonical hand, degrees, X then Y then Z. */
  turn: Vec;
  /** 0 straight, 1 fully curled: index, middle, ring, little. */
  curl: [number, number, number, number];
  /** Extra sideways angle per finger, degrees (+ toward the little finger). */
  splay?: [number, number, number, number];
  thumb: ThumbPose;
}

// Canonical right-hand joints (mm): MCP knuckle bases and phalanx lengths.
const knuckles: Vec[] = [
  [-30, 88, 2],
  [-10, 94, 3],
  [10, 90, 2],
  [27, 80, 0],
];
const phalanges = [
  [42, 25, 21],
  [46, 28, 23],
  [43, 27, 22],
  [34, 20, 19],
];
const restSplay = [-7, 0, 5, 11];
// Share of a full curl taken by each joint: MCP, PIP, DIP (degrees at curl 1).
const curlAngles = [80, 100, 70];
const thumbBase: Vec = [-20, 22, 6];
const thumbBones = [44, 32, 26];

const rad = (deg: number) => (deg * Math.PI) / 180;
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];

/** Rotate about an arbitrary unit axis (Rodrigues). */
function rotate(v: Vec, axis: Vec, deg: number): Vec {
  const t = rad(deg);
  const c = Math.cos(t);
  const s = Math.sin(t);
  const [x, y, z] = axis;
  const dot = v[0] * x + v[1] * y + v[2] * z;
  const cross: Vec = [
    y * v[2] - z * v[1],
    z * v[0] - x * v[2],
    x * v[1] - y * v[0],
  ];
  return [
    v[0] * c + cross[0] * s + x * dot * (1 - c),
    v[1] * c + cross[1] * s + y * dot * (1 - c),
    v[2] * c + cross[2] * s + z * dot * (1 - c),
  ];
}
export function euler(v: Vec, [rx, ry, rz]: Vec): Vec {
  return rotate(rotate(rotate(v, [1, 0, 0], rx), [0, 1, 0], ry), [0, 0, 1], rz);
}

/** A chain of bones from `start`, each bending further about `hinge`. */
function chain(
  start: Vec,
  direction: Vec,
  hinge: Vec,
  lengths: number[],
  bends: number[],
) {
  const points: Vec[] = [];
  let at = start;
  let angle = 0;
  lengths.forEach((length, i) => {
    angle += bends[i];
    at = add(at, scale(rotate(direction, hinge, angle), length));
    points.push(at);
  });
  return points;
}

/** The 21 landmarks of one hand, in world millimetres. */
export function handPoints(side: Side, pose: HandPose): Vec[] {
  const local: Vec[] = Array.from({ length: 21 }, () => [0, 0, 0] as Vec);
  const { spread, lift, curl } = pose.thumb;
  // Thumb: start pointing up the index, swing out toward −x, then lift to +z.
  const thumbDir = rotate(
    rotate([0, 1, 0], [0, 0, 1], spread),
    [0, 1, 0],
    lift,
  );
  const thumbHinge: Vec = rotate([1, 0, 0], [0, 0, 1], spread - 35);
  local[1] = thumbBase;
  chain(thumbBase, thumbDir, thumbHinge, thumbBones, [
    0,
    55 * curl,
    75 * curl,
  ]).forEach((p, i) => (local[2 + i] = p));
  FINGERS.forEach((_, f) => {
    const splay = restSplay[f] + (pose.splay?.[f] ?? 0);
    const direction = rotate([0, 1, 0], [0, 0, 1], -splay);
    const hinge = rotate([1, 0, 0], [0, 0, 1], -splay);
    const base = 5 + f * 4;
    local[base] = knuckles[f];
    chain(
      knuckles[f],
      direction,
      hinge,
      phalanges[f],
      curlAngles.map((a) => a * pose.curl[f]),
    ).forEach((p, i) => (local[base + 1 + i] = p));
  });
  return local.map((p) => {
    const mirrored: Vec = side === "L" ? [-p[0], p[1], p[2]] : p;
    return add(euler(mirrored, pose.turn), pose.at);
  });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpVec = (a: Vec, b: Vec, t: number): Vec => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
/** In-between pose for the forming animation. */
export function blend(a: HandPose, b: HandPose, t: number): HandPose {
  return {
    at: lerpVec(a.at, b.at, t),
    turn: lerpVec(a.turn, b.turn, t),
    curl: a.curl.map((c, i) => lerp(c, b.curl[i], t)) as HandPose["curl"],
    splay: (a.splay ?? [0, 0, 0, 0]).map((s, i) =>
      lerp(s, b.splay?.[i] ?? 0, t),
    ) as HandPose["splay"],
    thumb: {
      spread: lerp(a.thumb.spread, b.thumb.spread, t),
      lift: lerp(a.thumb.lift, b.thumb.lift, t),
      curl: lerp(a.thumb.curl, b.thumb.curl, t),
    },
  };
}

// ---- Measurement, shared by the model and the camera landmarks ----

export interface Point3 {
  x: number;
  y: number;
  z?: number;
}
const angleBetween = (a: Vec, b: Vec) => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = Math.hypot(...a) * Math.hypot(...b);
  return len
    ? (Math.acos(Math.max(-1, Math.min(1, dot / len))) * 180) / Math.PI
    : 0;
};
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/**
 * How bent each digit is, 0 straight to 1 fully curled, from the angles
 * between its bones. Works on model points and camera landmarks alike.
 */
export function bends(points: Vec[]): Record<Digit, number> {
  const bend = (indices: number[], full: number) => {
    let total = 0;
    for (let i = 0; i + 2 < indices.length; i++)
      total += angleBetween(
        sub(points[indices[i + 1]], points[indices[i]]),
        sub(points[indices[i + 2]], points[indices[i + 1]]),
      );
    return Math.min(1, total / full);
  };
  return {
    thumb: bend([1, 2, 3, 4], 130),
    index: bend([0, 5, 6, 7, 8], 250),
    middle: bend([0, 9, 10, 11, 12], 250),
    ring: bend([0, 13, 14, 15, 16], 250),
    little: bend([0, 17, 18, 19, 20], 250),
  };
}

/** Camera landmarks as aspect-corrected vectors (z shares x's scale). */
export function landmarkVecs(hand: Point3[], aspect: number): Vec[] {
  return hand.map((p) => [p.x * aspect, p.y, (p.z ?? 0) * aspect]);
}
