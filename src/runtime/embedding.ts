import { readSampleMap } from "./recognition.ts";
import type { Diagnosis, Templates } from "./recognition";

export const IMAGE_STORAGE_KEY = "naruto-ninja.image-calibration.v1";
// Starting guesses, not measured: cosine distance (1 − similarity) between
// unit-norm MobileNet embeddings. Tune against real calibration data.
export const IMAGE_MATCH_LIMIT = 0.2;
const IMAGE_MATCH_MARGIN = 0.02;

export function cosineDistance(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? 1 - dot / Math.sqrt(na * nb) : 1;
}

/** Same contract as the landmark matcher, over image embeddings. */
export function diagnoseEmbedding(
  embedding: number[] | null | undefined,
  templates: Templates,
): Diagnosis {
  if (!embedding?.length) return { reason: "no-hands" };
  const [best, second] = Object.entries(templates)
    .filter(([, samples]) => samples.length >= 3)
    .map(([id, samples]) => ({
      id,
      distance: Math.min(
        ...samples
          .filter((sample) => sample.length === embedding.length)
          .map((sample) => cosineDistance(sample, embedding)),
      ),
    }))
    .filter(({ distance }) => Number.isFinite(distance))
    .sort((a, b) => a.distance - b.distance);
  if (!best) return { reason: "uncalibrated" };
  const result = { best: best.id, distance: best.distance };
  if (best.distance > IMAGE_MATCH_LIMIT)
    return { reason: "no-match", ...result };
  if (second && second.distance - best.distance < IMAGE_MATCH_MARGIN)
    return { reason: "ambiguous", ...result, runnerUp: second.id };
  return { reason: "match", ...result };
}

/** Rounded copy for storage: 1024 floats at 4 decimals is ~7 KB a sample. */
export const compactEmbedding = (embedding: number[]) =>
  embedding.map((value) => Math.round(value * 1e4) / 1e4);

export const readEmbeddings = (raw: string | null, allowed: Set<string>) =>
  readSampleMap(
    raw,
    allowed,
    (sample) =>
      sample.length > 0 &&
      sample.length <= 4096 &&
      sample.every((n) => Math.abs(n) <= 1),
  );
