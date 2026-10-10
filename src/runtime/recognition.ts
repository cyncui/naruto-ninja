export interface Point {
  x: number;
  y: number;
  z?: number;
}
export type Templates = Record<string, number[][]>;
export const STORAGE_KEY = "naruto-ninja.calibration.v1";

// Shared image coordinates retain the relationship between hands; per-hand world origins do not.
export function features(hands: Point[][], aspect: number): number[] | null {
  if (hands.length !== 2 || hands.some((hand) => hand.length !== 21))
    return null;
  const ordered = [...hands].sort((a, b) => a[0].x - b[0].x);
  const cx = (ordered[0][0].x + ordered[1][0].x) / 2;
  const cy = (ordered[0][0].y + ordered[1][0].y) / 2;
  const scale =
    ordered.reduce(
      (sum, hand) =>
        sum +
        Math.hypot((hand[9].x - hand[0].x) * aspect, hand[9].y - hand[0].y),
      0,
    ) / 2;
  if (scale < 0.025) return null;
  return ordered.flatMap((hand) =>
    hand.flatMap((p) => [((p.x - cx) * aspect) / scale, (p.y - cy) / scale]),
  );
}

export function classify(
  vector: number[] | null,
  templates: Templates,
): string | null {
  if (!vector) return null;
  const distances = Object.entries(templates)
    .filter(([, samples]) => samples.length >= 3)
    .map(([id, samples]) => ({
      id,
      distance: Math.min(
        ...samples.map((sample) =>
          Math.sqrt(
            sample.reduce(
              (sum, value, i) => sum + (value - vector[i]) ** 2,
              0,
            ) / vector.length,
          ),
        ),
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
  const best = distances[0];
  if (
    !best ||
    best.distance > 0.16 ||
    (distances[1] && distances[1].distance - best.distance < 0.035)
  )
    return null;
  return best.id;
}

export function readTemplates(
  raw: string | null,
  allowed: Set<string>,
): Templates {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([id, samples]) =>
          allowed.has(id) &&
          Array.isArray(samples) &&
          samples.length <= 12 &&
          samples.every(
            (sample) =>
              Array.isArray(sample) &&
              sample.length === 84 &&
              sample.every(
                (n) =>
                  typeof n === "number" &&
                  Number.isFinite(n) &&
                  Math.abs(n) < 100,
              ),
          ),
      ),
    );
  } catch {
    return {};
  }
}
