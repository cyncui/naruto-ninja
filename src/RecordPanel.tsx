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

function loadFields(): Fields {
  const empty = { person: "", place: "", lighting: "", notes: "" };
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(INFO_KEY) ?? "{}") };
  } catch {
    return empty;
  }
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
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [now, setNow] = useState(0);
  const [, setVersion] = useState(0);
  const [unsaved, setUnsaved] = useState(false);
  const queue = useRef<string[]>([]);
  const ready =
    model.cameraStatus === "live" && model.trackerStatus === "ready";
  const sequenceLabel = `sequence:${model.variantId}`;
  const nameOf = (id: string) =>
    id === sequenceLabel
      ? `Full sequence · ${model.selected.name}`
      : (model.seals.find((s) => s.id === id)?.name ??
        id.replace("none:", "Not a seal · "));

  const update = (key: keyof Fields, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    try {
      localStorage.setItem(INFO_KEY, JSON.stringify(next));
    } catch {}
  };
  const advance = () => {
    const next = queue.current.shift();
    setPhase(
      next
        ? {
            kind: "countdown",
            label: next,
            until: performance.now() + COUNTDOWN_MS,
          }
        : { kind: "idle" },
    );
    if (next) setLabel(next);
  };
  const run = (labelsToRecord: string[]) => {
    recorder.current ??= new SessionRecorder(
      {
        ...fields,
        session: crypto.randomUUID().slice(0, 8),
        device: navigator.userAgent,
        matcher,
        startedAt: new Date().toISOString(),
      },
      performance.now(),
    );
    queue.current = labelsToRecord;
    advance();
  };
  const stop = () => {
    queue.current = [];
    if (recorder.current?.endClip(performance.now())) setUnsaved(true);
    setVersion((v) => v + 1);
    setPhase({ kind: "idle" });
  };

  useEffect(() => {
    if (phase.kind === "idle") return;
    const timer = setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t < phase.until) return;
      if (phase.kind === "countdown") {
        recorder.current?.startClip(
          phase.label,
          t,
          phase.label === sequenceLabel
            ? model.sequence.map((s) => s.id)
            : undefined,
        );
        setPhase({
          kind: "recording",
          label: phase.label,
          until: t + seconds * 1000,
        });
      } else {
        if (recorder.current?.endClip(t)) setUnsaved(true);
        setVersion((v) => v + 1);
        advance();
      }
    }, 100);
    return () => clearInterval(timer);
  });
  // The camera stopping ends the clip: later frames would not be tracked.
  useEffect(() => {
    if (!ready && phase.kind !== "idle") stop();
  });
  useEffect(() => {
    document.body.classList.add("recording-mode");
    return () => document.body.classList.remove("recording-mode");
  }, []);
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

  const stats = recorder.current?.stats() ?? [];
  const pct = (n: number, total: number) =>
    total ? `${Math.round((n / total) * 100)}%` : "–";
  const remaining = phase.kind === "idle" ? 0 : Math.max(0, phase.until - now);
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
          {phase.kind === "idle"
            ? `${recorder.current?.clips.length ?? 0} CLIPS`
            : phase.kind === "countdown"
              ? `READY ${Math.ceil(remaining / 1000)}`
              : `REC ${(remaining / 1000).toFixed(1)}S`}
        </span>
      </button>
      {open && (
        <div className="record-body">
          <div className="record-call" role="status" aria-live="polite">
            {phase.kind === "idle" ? (
              <p>
                {ready
                  ? "Pick a label and record. Frames with no hands are kept."
                  : "Start the camera and wait for tracking to record."}
              </p>
            ) : (
              <>
                <span>
                  {phase.kind === "countdown" ? "Get ready" : "Recording"}
                </span>
                <strong>{nameOf(phase.label)}</strong>
                <span>
                  {model.handsDetected}/2 hands
                  {queue.current.length
                    ? ` · ${queue.current.length} to go`
                    : ""}
                </span>
              </>
            )}
          </div>
          <div className="record-fields">
            {(["person", "place", "lighting", "notes"] as const).map((key) => (
              <label key={key}>
                <span>{key}</span>
                <input
                  value={fields[key]}
                  disabled={!!recorder.current}
                  placeholder={
                    key === "person"
                      ? "p1"
                      : key === "place"
                        ? "desk"
                        : key === "lighting"
                          ? "daylight"
                          : "optional"
                  }
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
          {stats.length > 0 && (
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
                    <td>{nameOf(row.label)}</td>
                    <td>{row.clips}</td>
                    <td>{row.frames}</td>
                    <td>
                      {row.hands.map((n) => pct(n, row.frames)).join(" / ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="record-actions">
            <button
              disabled={
                phase.kind !== "idle" || !recorder.current?.clips.length
              }
              onClick={() => {
                recorder.current?.discardLastClip();
                setVersion((v) => v + 1);
              }}
            >
              Discard last clip
            </button>
            <button
              disabled={
                phase.kind !== "idle" || !recorder.current?.clips.length
              }
              onClick={download}
            >
              Download .jsonl
            </button>
            <button
              disabled={phase.kind !== "idle" || !recorder.current}
              onClick={newSession}
            >
              New session
            </button>
          </div>
          <p className="record-foot">
            Saves hand landmarks, handedness and image embeddings, never video.
            Session details lock once the first clip is recorded.
          </p>
        </div>
      )}
    </section>
  );
}
