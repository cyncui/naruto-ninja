export const DRILL_LENGTH = 10;
export const BEST_KEY = "naruto-ninja.arena-best.v1";

export interface DrillResult {
  correct: number;
  total: number;
  /** Seconds for the whole round. */
  time: number;
}

/** Random prompts with no seal asked twice in a row. */
export function makeQueue(
  ids: readonly string[],
  length = DRILL_LENGTH,
  random = Math.random,
) {
  const queue: string[] = [];
  while (queue.length < length) {
    const options = ids.filter((id) => id !== queue[queue.length - 1]);
    queue.push(options[Math.floor(random() * options.length)]);
  }
  return queue;
}

/** More correct answers win; equal scores go to the faster round. */
export function isBetter(next: DrillResult, best: DrillResult | null) {
  if (!best) return true;
  if (next.correct !== best.correct) return next.correct > best.correct;
  return next.time < best.time;
}

export function readBest(raw: string | null): DrillResult | null {
  try {
    const value = JSON.parse(raw ?? "null");
    return value &&
      [value.correct, value.total, value.time].every(
        (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
      )
      ? { correct: value.correct, total: value.total, time: value.time }
      : null;
  } catch {
    return null;
  }
}
