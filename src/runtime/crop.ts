import type { Point } from "./recognition";

export interface Region {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export type CropSource = "hands" | "recent" | "center";

/** Fallback when the tracker loses a clasped seal: the middle of the frame. */
export const CENTER_REGION: Region = {
  left: 0.25,
  top: 0.15,
  right: 0.75,
  bottom: 0.85,
};
const padding = 0.35;

/**
 * Square (in pixels) normalized region around every tracked hand, padded so
 * fingers the tracker misplaces still fall inside. Null with no hands.
 */
export function handRegion(hands: Point[][], aspect: number): Region | null {
  const points = hands.flat();
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  // Work in pixel-proportional units so the crop is square on screen.
  const side =
    Math.max(
      (Math.max(...xs) - Math.min(...xs)) * aspect,
      Math.max(...ys) - Math.min(...ys),
    ) *
    (1 + padding * 2);
  const halfX = Math.min(0.5, side / aspect / 2);
  const halfY = Math.min(0.5, side / 2);
  const clamp = (centre: number, half: number) =>
    Math.min(Math.max(centre, half), 1 - half);
  const x = clamp(cx, halfX);
  const y = clamp(cy, halfY);
  return {
    left: x - halfX,
    top: y - halfY,
    right: x + halfX,
    bottom: y + halfY,
  };
}

/**
 * A clasped seal often loses tracking entirely, so reuse the last hand box
 * for a second before falling back to the centre of the frame.
 */
export class CropMemory {
  private recent: { region: Region; at: number } | undefined;
  next(
    hands: Point[][],
    aspect: number,
    now: number,
  ): { region: Region; source: CropSource } {
    const region = handRegion(hands, aspect);
    if (region) {
      this.recent = { region, at: now };
      return { region, source: "hands" };
    }
    if (this.recent && now - this.recent.at < 1000)
      return { region: this.recent.region, source: "recent" };
    return { region: CENTER_REGION, source: "center" };
  }
}
