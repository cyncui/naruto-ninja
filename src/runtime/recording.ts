import type { Point } from "./recognition";
import type { Handedness } from "./useCamera";

// Labelled session recording for training and evaluating a seal model
// (docs/trained-classifier-plan.md). Landmarks and embeddings only, no pixels.
const RECORD_VERSION = 1;
export const NONE_LABELS = [
  "none:rest",
  "none:transition",
  "none:lookalike",
] as const;

export interface SessionInfo {
  session: string;
  person: string;
  place: string;
  lighting: string;
  notes: string;
  device: string;
  matcher: string;
  startedAt: string;
}
export interface RecordedFrame {
  t: number;
  hands: Point[][];
  handedness: Handedness[];
  aspect: number;
  embedding?: number[];
  crop?: string;
}
export interface Clip {
  label: string;
  /** Seal order for a full-sequence clip. */
  steps?: string[];
  start: number;
  end?: number;
  frames: RecordedFrame[];
}
export interface LabelStats {
  label: string;
  clips: number;
  frames: number;
  /** Frames with 0, 1 and 2 tracked hands. */
  hands: [number, number, number];
}

const round = (n: number) => Math.round(n * 1e4) / 1e4;

export class SessionRecorder {
  readonly info: SessionInfo;
  private readonly origin: number;
  private readonly done: Clip[] = [];
  private current: Clip | null = null;
  private lastEmbedding: number[] | undefined;

  constructor(info: SessionInfo, now: number) {
    this.info = info;
    this.origin = now;
  }

  get recording() {
    return this.current !== null;
  }
  get clips(): readonly Clip[] {
    return this.done;
  }

  startClip(label: string, now: number, steps?: string[]) {
    this.endClip(now);
    this.current = { label, steps, start: this.at(now), frames: [] };
    this.lastEmbedding = undefined;
  }

  /** Close the open clip. Empty clips are dropped. */
  endClip(now: number) {
    const clip = this.current;
    this.current = null;
    if (!clip?.frames.length) return null;
    clip.end = this.at(now);
    this.done.push(clip);
    return clip;
  }

  /** Append a tracker frame to the open clip, including frames with no hands. */
  frame(
    frame: {
      hands: Point[][];
      handedness?: Handedness[];
      aspect: number;
      embedding?: number[];
      crop?: string;
    },
    now: number,
  ) {
    const clip = this.current;
    if (!clip) return false;
    // The embedding updates slower than the tracker; store each one once.
    const fresh =
      frame.embedding?.length && frame.embedding !== this.lastEmbedding;
    if (fresh) this.lastEmbedding = frame.embedding;
    clip.frames.push({
      t: this.at(now),
      hands: frame.hands.map((hand) =>
        hand.map((p) => ({ x: round(p.x), y: round(p.y), z: round(p.z ?? 0) })),
      ),
      handedness: (frame.handedness ?? []).map(({ label, score }) => ({
        label,
        score: round(score),
      })),
      aspect: round(frame.aspect),
      ...(fresh && {
        embedding: frame.embedding!.map(round),
        crop: frame.crop,
      }),
    });
    return true;
  }

  discardLastClip() {
    return this.done.pop() ?? null;
  }

  stats(): LabelStats[] {
    const byLabel = new Map<string, LabelStats>();
    for (const clip of this.done) {
      const row = byLabel.get(clip.label) ?? {
        label: clip.label,
        clips: 0,
        frames: 0,
        hands: [0, 0, 0],
      };
      row.clips++;
      row.frames += clip.frames.length;
      for (const frame of clip.frames)
        row.hands[Math.min(frame.hands.length, 2)]++;
      byLabel.set(clip.label, row);
    }
    return [...byLabel.values()];
  }

  /** One JSON object per line: session, then each clip followed by its frames. */
  toJSONL() {
    const lines = [
      JSON.stringify({
        type: "session",
        version: RECORD_VERSION,
        ...this.info,
      }),
    ];
    this.done.forEach((clip, id) => {
      const { frames, ...meta } = clip;
      lines.push(
        JSON.stringify({
          type: "clip",
          clip: id,
          ...meta,
          frames: frames.length,
        }),
      );
      for (const frame of frames)
        lines.push(JSON.stringify({ type: "frame", clip: id, ...frame }));
    });
    return lines.join("\n") + "\n";
  }

  fileName() {
    const safe = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `session-${this.info.startedAt.slice(0, 10)}-${safe(this.info.person) || "anon"}-${safe(this.info.session)}.jsonl`;
  }

  private at(now: number) {
    return Math.round(now - this.origin);
  }
}

/** Parse a recorded session back into clips. Throws on malformed input. */
export function readSession(text: string) {
  let info: (SessionInfo & { version: number }) | undefined;
  const clips: Clip[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const { type, clip, ...rest } = JSON.parse(line);
    if (type === "session") info = rest;
    else if (type === "clip") {
      const { frames: _count, ...meta } = rest;
      clips[clip] = { ...meta, frames: [] };
    } else if (type === "frame") {
      if (!clips[clip]) throw new Error(`Frame before clip ${clip}`);
      clips[clip].frames.push(rest);
    } else throw new Error(`Unknown line type ${type}`);
  }
  if (!info) throw new Error("Missing session line");
  if (info.version !== RECORD_VERSION)
    throw new Error(`Unsupported recording version ${info.version}`);
  return { info, clips };
}
