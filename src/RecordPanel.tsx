import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { AppModel } from "./app-model";
import { SessionRecorder } from "./runtime/recording";
import type { SessionInfo } from "./runtime/recording";
import "./record.css";

// ?record: labelled data collection for the trained seal model
// (docs/trained-classifier-plan.md, milestone 1). Clips are kept in memory
// until downloaded as JSONL.
const INFO_KEY = "naruto-ninja.record.v1";
const COUNTDOWN_MS = 3000;
const DURATIONS = [5, 10, 20];
type Fields = Pick<SessionInfo, "person" | "place" | "lighting" | "notes">;
type Phase =
  | { kind: "idle" }
  | { kind: "countdown" | "recording"; label: string; until: number };

const placeholders: Record<keyof Fields, string> = {
  person: "p1",
  place: "desk",
  lighting: "daylight",
  notes: "optional",
};
const pct = (n: number, total: number) =>
  total ? `${Math.round((n / total) * 100)}%` : "–";

/** Recorder bar readout: clip count, countdown or time left. */
function barState(phase: Phase, remaining: number, clips: number) {
  if (phase.kind === "idle") return `${clips} CLIPS`;
  return phase.kind === "countdown"
    ? `READY ${Math.ceil(remaining / 1000)}`
    : `REC ${(remaining / 1000).toFixed(1)}S`;
}

function RecordCall({
  phase,
  ready,
  name,
  hands,
  queued,
}: {
  phase: Phase;
  ready: boolean;
  name: (id: string) => string;
  hands: number;
  queued: number;
}) {
  return (
    <div className="record-call" role="status" aria-live="polite">
      {phase.kind === "idle" ? (
        <p>
          {ready
            ? "Pick a label and record. Frames with no hands are kept."
            : "Start the camera and wait for tracking to record."}
        </p>
      ) : (
        <>
          <span>{phase.kind === "countdown" ? "Get ready" : "Recording"}</span>
          <strong>{name(phase.label)}</strong>
          <span>
            {hands}/2 hands
            {queued ? ` · ${queued} to go` : ""}
          </span>
        </>
      )}
    </div>
  );
}

function RecordStats({
  stats,
  name,
}: {
  stats: ReturnType<SessionRecorder["stats"]>;
  name: (id: string) => string;
}) {
  return (
    <table className="record-stats">
      <thead>
        <tr>
          <th>Label</th>
          <th>Clips</th>
          <th>Frames</th>
          <th title="Share of frames with 0, 1 and 2 tracked hands">
            0/1/2 hands
          </th>
        </tr>
      </thead>
      <tbody>
        {stats.map((row) => (
          <tr key={row.label}>
            <td>{name(row.label)}</td>
            <td>{row.clips}</td>
            <td>{row.frames}</td>
            <td>{row.hands.map((n) => pct(n, row.frames)).join(" / ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function loadFields(): Fields {
  const empty = { person: "", place: "", lighting: "", notes: "" };
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(INFO_KEY) ?? "{}") };
  } catch {
    return empty;
  }
}

interface SessionInput {
  recorder: RefObject<SessionRecorder | null>;
  ready: boolean;
  /** Clip length in seconds. */
  seconds: number;
  onLabel: (label: string) => void;
  /** Expected seal ids when `label` is a full sequence. */
  steps: (label: string) => string[] | undefined;
  /** Session details, read when the first clip starts. */
  info: () => SessionInfo;
}

/**
 * The recording state machine: a queue of labels, each a countdown then a
 * timed clip, plus downloading and the unsaved-clips guard.
 */
function useRecordingSession(input: SessionInput) {
  const { recorder, ready } = input;
  const latest = useRef(input);
  latest.current = input;
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [now, setNow] = useState(0);
  const [, setVersion] = useState(0);
  const [unsaved, setUnsaved] = useState(false);
  const queue = useRef<string[]>([]);

  const endClip = (t: number) => {
    if (recorder.current?.endClip(t)) setUnsaved(true);
    setVersion((v) => v + 1);
  };
  const advance = () => {
    const next = queue.current.shift();
    if (!next) {
      setPhase({ kind: "idle" });
      return;
    }
    setPhase({
      kind: "countdown",
      label: next,
      until: performance.now() + COUNTDOWN_MS,
    });
    latest.current.onLabel(next);
  };
  const run = (labels: string[]) => {
    recorder.current ??= new SessionRecorder(
      latest.current.info(),
      performance.now(),
    );
    queue.current = labels;
    advance();
  };
  const stop = () => {
    queue.current = [];
    endClip(performance.now());
    setPhase({ kind: "idle" });
  };
  /** Countdown over: start the clip. Clip over: save it and move on. */
  const step = (t: number) => {
    if (phase.kind === "idle" || t < phase.until) return;
    if (phase.kind === "recording") {
      endClip(t);
      advance();
      return;
    }
    const { steps, seconds } = latest.current;
    recorder.current?.startClip(phase.label, t, steps(phase.label));
    setPhase({
      kind: "recording",
      label: phase.label,
      until: t + seconds * 1000,
    });
  };

  useEffect(() => {
    if (phase.kind === "idle") return;
    const timer = setInterval(() => {
      const t = performance.now();
      setNow(t);
      step(t);
    }, 100);
    return () => clearInterval(timer);
  });
  // The camera stopping ends the clip: later frames would not be tracked.
  useEffect(() => {
    if (!ready && phase.kind !== "idle") stop();
  });
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const download = () => {
    const rec = recorder.current;
    if (!rec?.clips.length) return;
    const url = URL.createObjectURL(
      new Blob([rec.toJSONL()], { type: "application/x-ndjson" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = rec.fileName();
    link.click();
    URL.revokeObjectURL(url);
    setUnsaved(false);
  };
  const newSession = () => {
    if (unsaved && !confirm("Discard clips that were not downloaded?")) return;
    stop();
    recorder.current = null;
    setUnsaved(false);
  };
  const discardLastClip = () => {
    recorder.current?.discardLastClip();
    setVersion((v) => v + 1);
  };
  return {
    phase,
    now,
    queue,
    run,
    stop,
    download,
    newSession,
    discardLastClip,
  };
}

/** Clip housekeeping, available between recordings. */
function ClipActions({
  session,
  clips,
  started,
}: {
  session: ReturnType<typeof useRecordingSession>;
  clips: number;
  started: boolean;
}) {
  const busy = session.phase.kind !== "idle";
  return (
    <div className="record-actions">
      <button disabled={busy || !clips} onClick={session.discardLastClip}>
        Discard last clip
      </button>
      <button disabled={busy || !clips} onClick={session.download}>
        Download .jsonl
      </button>
      <button disabled={busy || !started} onClick={session.newSession}>
        New session
      </button>
    </div>
  );
}

export default function RecordPanel({
  model,
  recorder,
  labels,
  matcher,
}: {
  model: AppModel;
  recorder: RefObject<SessionRecorder | null>;
  /** Static seal ids followed by the `none:*` labels. */
  labels: string[];
  matcher: string;
}) {
  const [open, setOpen] = useState(true);
  const [fields, setFields] = useState(loadFields);
  const [label, setLabel] = useState(labels[0]);
  const [seconds, setSeconds] = useState(10);
  const ready =
    model.cameraStatus === "live" && model.trackerStatus === "ready";
  const sequenceLabel = `sequence:${model.variantId}`;
  const nameOf = (id: string) =>
    id === sequenceLabel
      ? `Full sequence · ${model.selected.name}`
      : (model.seals.find((s) => s.id === id)?.name ??
        id.replace("none:", "Not a seal · "));

  const session = useRecordingSession({
    recorder,
    ready,
    seconds,
    onLabel: setLabel,
    steps: (id) =>
      id === sequenceLabel ? model.sequence.map((s) => s.id) : undefined,
    info: () => ({
      ...fields,
      session: crypto.randomUUID().slice(0, 8),
      device: navigator.userAgent,
      matcher,
      startedAt: new Date().toISOString(),
    }),
  });
  const { phase, queue, run, stop } = session;
  const update = (key: keyof Fields, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    try {
      localStorage.setItem(INFO_KEY, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    document.body.classList.add("recording-mode");
    return () => document.body.classList.remove("recording-mode");
  }, []);

  const stats = recorder.current?.stats() ?? [];
  const remaining =
    phase.kind === "idle" ? 0 : Math.max(0, phase.until - session.now);
  const options = [
    ...labels,
    ...(model.sequence.length ? [sequenceLabel] : []),
  ];

  return (
    <section
      className={`record-panel ${open ? "" : "closed"}`}
      aria-label="Recorder"
    >
      <button
        className="record-bar"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          <b lang="ja">記録</b> RECORDER
        </span>
        <i className={`record-dot ${phase.kind}`} aria-hidden="true" />
        <span className="record-bar-state">
          {barState(phase, remaining, recorder.current?.clips.length ?? 0)}
        </span>
      </button>
      {open && (
        <div className="record-body">
          <RecordCall
            phase={phase}
            ready={ready}
            name={nameOf}
            hands={model.handsDetected}
            queued={queue.current.length}
          />
          <div className="record-fields">
            {(["person", "place", "lighting", "notes"] as const).map((key) => (
              <label key={key}>
                <span>{key}</span>
                <input
                  value={fields[key]}
                  disabled={!!recorder.current}
                  placeholder={placeholders[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="record-controls">
            <label>
              <span>Label</span>
              <select
                value={label}
                disabled={phase.kind !== "idle"}
                onChange={(e) => setLabel(e.target.value)}
              >
                {options.map((id) => (
                  <option key={id} value={id}>
                    {nameOf(id)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Length</span>
              <select
                value={seconds}
                disabled={phase.kind !== "idle"}
                onChange={(e) => setSeconds(Number(e.target.value))}
              >
                {DURATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s} s
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="record-actions">
            {phase.kind === "idle" ? (
              <>
                <button
                  className="preview-button"
                  disabled={!ready}
                  onClick={() => run([label])}
                >
                  Record
                </button>
                <button
                  disabled={!ready}
                  onClick={() =>
                    run(labels.slice(Math.max(0, labels.indexOf(label))))
                  }
                >
                  Record all from here
                </button>
              </>
            ) : (
              <button className="preview-button" onClick={stop}>
                Stop
              </button>
            )}
          </div>
          {stats.length > 0 && <RecordStats stats={stats} name={nameOf} />}
          <ClipActions
            session={session}
            clips={recorder.current?.clips.length ?? 0}
            started={!!recorder.current}
          />
          <p className="record-foot">
            Saves hand landmarks, handedness and image embeddings, never video.
            Session details lock once the first clip is recorded.
          </p>
        </div>
      )}
    </section>
  );
}
