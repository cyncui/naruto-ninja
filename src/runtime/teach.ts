// Hands-free calibration: while practice waits on a seal with too few samples,
// capture one each time the pose has stayed steady long enough.
export const TEACH_SAMPLES = 3;
export const TEACH_HOLD_MS = 900;

export class SteadyCapture {
  private previous: number[] | null = null;
  private since = 0;

  private readonly steady: number;
  private readonly distance: (a: number[], b: number[]) => number;

  /**
   * @param steady Largest frame-to-frame change that still counts as holding still.
   */
  constructor(steady: number, distance: (a: number[], b: number[]) => number) {
    this.steady = steady;
    this.distance = distance;
  }

  /** Hold progress (0–1) and, when a hold completes, the sample to store. */
  update(vector: number[] | null | undefined, now: number) {
    const previous = this.previous;
    this.previous = vector ?? null;
    if (
      !vector ||
      !previous ||
      previous.length !== vector.length ||
      this.distance(previous, vector) > this.steady
    ) {
      this.since = now;
      return { hold: 0, sample: null };
    }
    const held = now - this.since;
    if (held < TEACH_HOLD_MS)
      return { hold: held / TEACH_HOLD_MS, sample: null };
    this.since = now;
    return { hold: 1, sample: vector };
  }

  reset() {
    this.previous = null;
  }
}

/** Root-mean-square difference, the landmark matcher's distance. */
export function rms(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum / a.length);
}
