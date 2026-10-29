/**
 * Consecutive failed frames from a vision worker. MediaPipe can throw on a
 * single awkward frame (hands crossing, a clasped seal) and recover on the
 * next, so one failure skips the frame; only a run of them stops the worker.
 */
export class FrameErrors {
  private run = 0;
  private readonly limit: number;

  constructor(limit = 3) {
    this.limit = limit;
  }

  ok() {
    this.run = 0;
  }

  /** Record a failed frame. True once the worker should be given up on. */
  failed(task: string, message: unknown) {
    this.run++;
    console.warn(
      `${task} skipped a frame (${this.run}/${this.limit})`,
      message,
    );
    return this.run >= this.limit;
  }
}
