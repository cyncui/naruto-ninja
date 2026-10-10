export function advanceSequence(
  steps: readonly string[],
  progress: number,
  seal: string,
) {
  if (!steps.length) return { progress: 0, complete: false, correct: false };
  const next =
    steps[progress] === seal ? progress + 1 : steps[0] === seal ? 1 : 0;
  return {
    progress: next,
    complete: next === steps.length,
    correct: steps[progress] === seal,
  };
}

export class StableSeal {
  private candidate: string | null = null;
  private since = 0;
  private emitted: string | null = null;
  private releasedAt: number | null = null;

  update(label: string | null, now: number) {
    if (label === null) {
      this.releasedAt ??= now;
      if (now - this.releasedAt >= 180) this.emitted = null;
      this.candidate = null;
      return null;
    }
    this.releasedAt = null;
    if (this.candidate !== label) {
      this.candidate = label;
      this.since = now;
    }
    if (now - this.since >= 350 && this.emitted !== label) {
      this.emitted = label;
      return label;
    }
    return null;
  }
}
