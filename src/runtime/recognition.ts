export interface Point {
  x: number;
  y: number;
  z?: number;
}
export type Templates = Record<string, number[][]>;
export const STORAGE_KEY = "naruto-ninja.calibration.v1";

// Shared image coordinates retain the relationship between hands; per-hand world origins do not.
// Clasped seals often track as one merged hand, so one hand (42 values) is a
// valid pose too: matching only needs it to look the same each time.
export function features(hands: Point[][], aspect: number): number[] | null {
  if (
    hands.length < 1 ||
    hands.length > 2 ||
    hands.some((hand) => hand.length !== 21)
  )
    return null;
  const ordered = [...hands].sort((a, b) => a[0].x - b[0].x);
  const mean = (value: (hand: Point[]) => number) =>
    ordered.reduce((sum, hand) => sum + value(hand), 0) / ordered.length;
  const cx = mean((hand) => hand[0].x);
  const cy = mean((hand) => hand[0].y);
  const scale = mean((hand) =>
    Math.hypot((hand[9].x - hand[0].x) * aspect, hand[9].y - hand[0].y),
  );
  if (scale < 0.025) return null;
  return ordered.flatMap((hand) =>
    hand.flatMap((p) => [((p.x - cx) * aspect) / scale, (p.y - cy) / scale]),
  );
}

export const MATCH_LIMIT = 0.16;
const MATCH_MARGIN = 0.035;
export type Diagnosis =
  | { reason: "no-hands" | "too-small" | "uncalibrated" }
  | { reason: "hand-count"; hands: number }
  | {
      reason: "no-match" | "ambiguous" | "match";
      best: string;
      distance: number;
      runnerUp?: string;
    };

// Seals with at least three samples, nearest first. A pose is only compared
// with samples captured at the same hand count.
function rank(vector: number[], templates: Templates) {
  return Object.entries(templates)
    .filter(([, samples]) => samples.length >= 3)
    .map(
      ([id, samples]) =>
        [id, samples.filter((s) => s.length === vector.length)] as const,
    )
    .filter(([, samples]) => samples.length > 0)
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
}

/** Nearest calibrated seal for a pose, or why the pose was rejected. */
export function diagnose(
  hands: Point[][],
  aspect: number,
  templates: Templates,
): Diagnosis {
  if (hands.length === 0) return { reason: "no-hands" };
  const vector = features(hands, aspect);
  if (!vector) return { reason: "too-small" };
  const [best, second] = rank(vector, templates);
  if (!best)
    return Object.values(templates).some((samples) => samples.length >= 3)
      ? { reason: "hand-count", hands: hands.length }
      : { reason: "uncalibrated" };
  const result = { best: best.id, distance: best.distance };
  if (best.distance > MATCH_LIMIT) return { reason: "no-match", ...result };
  if (second && second.distance - best.distance < MATCH_MARGIN)
    return { reason: "ambiguous", ...result, runnerUp: second.id };
  return { reason: "match", ...result };
}

/** Equal enough that the on-screen readout would not change. */
export function sameDiagnosis(a: Diagnosis, b: Diagnosis) {
  if (a.reason !== b.reason) return false;
  if (!("best" in a) || !("best" in b)) return true;
  return (
    a.best === b.best &&
    a.runnerUp === b.runnerUp &&
    Math.abs(a.distance - b.distance) < 0.01
  );
}

export function classify(
  vector: number[] | null,
  templates: Templates,
): string | null {
  if (!vector) return null;
  const [best, second] = rank(vector, templates);
  if (
    !best ||
    best.distance > MATCH_LIMIT ||
    (second && second.distance - best.distance < MATCH_MARGIN)
  )
    return null;
  return best.id;
}

/**
 * Parses stored calibration samples, keeping only allowed seals whose 1–12
 * samples are arrays of finite numbers that also pass `valid`.
 */
export function readSampleMap(
  raw: string | null,
  allowed: Set<string>,
  valid: (sample: number[]) => boolean,
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
              sample.every(
                (n) => typeof n === "number" && Number.isFinite(n),
              ) &&
              valid(sample),
          ),
      ),
    );
  } catch {
    return {};
  }
}

export const readTemplates = (raw: string | null, allowed: Set<string>) =>
  readSampleMap(
    raw,
    allowed,
    (sample) =>
      (sample.length === 84 || sample.length === 42) &&
      sample.every((n) => Math.abs(n) < 100),
  );
