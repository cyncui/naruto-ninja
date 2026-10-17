import { useEffect, useRef, useState } from "react";
import type { AppModel } from "./app-model";
import SealRing from "./SealRing";
import type { MarkerState } from "./SealRing";
import SevenSegment from "./SevenSegment";
import Corrections from "./Corrections";
import { sealGuides } from "./seal-guide";
import { glyphFor, glyphs } from "./seals";
import { TEACH_SAMPLES } from "./runtime/teach";
import { BEST_KEY, DRILL_LENGTH, isBetter, makeQueue, readBest } from "./drill";
import type { DrillResult } from "./drill";

type Tab = "library" | "drill";
type Phase = "idle" | "running" | "done";

function loadBest() {
  try {
    return readBest(localStorage.getItem(BEST_KEY));
  } catch {
    return null;
  }
}

/** Practice arena: a library of the twelve seals and a timed recognition drill. */
export default function Arena({ model }: { model: AppModel }) {
  const seals = Object.keys(glyphs).flatMap((id) => {
    const seal = model.seals.find((s) => s.id === id);
    return seal ? [seal] : [];
  });
  const name = (id: string) => seals.find((s) => s.id === id)?.name ?? id;
  const live = model.cameraStatus === "live";
  const [tab, setTab] = useState<Tab>("library");
  const [selected, setSelected] = useState(seals[0].id);

  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(
    null,
  );
  const [best, setBest] = useState<DrillResult | null>(loadBest);
  const [result, setResult] = useState<
    (DrillResult & { record: boolean }) | null
  >(null);
  const advance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = queue[index];

  useEffect(() => () => clearTimeout(advance.current), []);
  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(
      () => setElapsed((performance.now() - startedAt) / 1000),
      100,
    );
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  const begin = () => {
    clearTimeout(advance.current);
    setQueue(makeQueue(seals.map((s) => s.id)));
    setIndex(0);
    setCorrect(0);
    setAnswered(0);
    setStreak(0);
    setFeedback(null);
    setResult(null);
    setElapsed(0);
    setStartedAt(performance.now());
    setPhase("running");
  };
  const finish = (score: number) => {
    const time = (performance.now() - startedAt) / 1000;
    const round = { correct: score, total: DRILL_LENGTH, time };
    const record = isBetter(round, best);
    if (record) {
      setBest(round);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(round));
      } catch {}
    }
    setElapsed(time);
    setResult({ ...round, record });
    setPhase("done");
  };
  const answer = (id: string) => {
    if (phase !== "running" || feedback) return;
    const ok = id === target;
    const score = correct + (ok ? 1 : 0);
    setFeedback({ id, ok });
    setCorrect(score);
    setAnswered(answered + 1);
    setStreak(ok ? streak + 1 : 0);
    // A miss holds a little longer so the right answer can be seen.
    advance.current = setTimeout(
      () => {
        setFeedback(null);
        if (index + 1 >= queue.length) finish(score);
        else setIndex(index + 1);
      },
      ok ? 450 : 1100,
    );
  };
  const answerRef = useRef(answer);
  answerRef.current = answer;
  const subscribe = model.onArenaSeal;
  useEffect(
    () => subscribe((id) => tab === "drill" && answerRef.current(id)),
    [subscribe, tab],
  );

  const calibrated = (id: string) => (model.samples[id] ?? 0) >= TEACH_SAMPLES;
  const issues = model.poseCheck
    ? new Set(model.poseCheck.issues.flatMap((issue) => issue.digits))
    : undefined;
  // Camera feedback checks the seal the arena is showing.
  const focus =
    tab === "library" ? selected : phase === "running" ? target : null;
  const setFocus = model.setArenaFocus;
  useEffect(() => {
    setFocus(focus ?? null);
    return () => setFocus(null);
  }, [focus, setFocus]);
  const drillState = (id: string): MarkerState =>
    !feedback
      ? ""
      : id === target
        ? "right"
        : id === feedback.id
          ? "wrong"
          : "";
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const ring =
    tab === "library" ? (
      <SealRing
        seals={seals}
        stateOf={(i) => (seals[i].id === selected ? "next" : "")}
        focusIndex={seals.findIndex((s) => s.id === selected)}
        progress={0}
        turns={0}
        figure={{
          sealId: selected,
          issues: live ? issues : undefined,
          label: `3D hand model of the ${name(selected)} seal`,
          still: model.reducedMotion,
        }}
        still={model.reducedMotion || live}
        onPick={(seal) => setSelected(seal.id)}
        pickLabel={(seal) => `Show ${seal.name}`}
        caption={
          live ? (
            <Corrections
              check={model.poseCheck}
              title={`${glyphFor(selected)} ${name(selected)}`}
              how={sealGuides[selected].how}
            />
          ) : (
            `${glyphFor(selected)} ${name(selected)} · mirror view · drag to turn`
          )
        }
        className="arena-ring"
      />
    ) : (
      <SealRing
        seals={seals}
        stateOf={(i) => drillState(seals[i].id)}
        focusIndex={-1}
        progress={phase === "idle" ? 0 : answered / DRILL_LENGTH}
        turns={answered}
        figure={
          phase === "running" && target
            ? {
                sealId: target,
                issues: live ? issues : undefined,
                label: "3D hand model of the seal to identify",
                still: model.reducedMotion,
              }
            : undefined
        }
        still={model.reducedMotion || live}
        onPick={phase === "running" ? (seal) => answer(seal.id) : undefined}
        pickLabel={(seal) => `Ring answer: ${seal.name}`}
        caption={
          phase === "running"
            ? live
              ? `Perform ${glyphFor(target)} ${name(target)}, or tap its tile`
              : "Identify this seal: tap its tile or ring marker"
            : phase === "done"
              ? "Round complete"
              : "Begin a 10-seal sync test"
        }
        className="arena-ring"
      />
    );

  return (
    <>
      {ring}
      <section className="arena-panel" aria-label="Seal arena">
        <header className="arena-bar">
          <span className="arena-title">
            <b lang="ja">印契演習場</b> Seal arena
          </span>
          <div className="arena-tabs" role="tablist" aria-label="Arena">
            {(["library", "drill"] as const).map((key) => (
              <button
                key={key}
                role="tab"
                id={`arena-tab-${key}`}
                aria-selected={tab === key}
                aria-controls="arena-tabpanel"
                onClick={() => setTab(key)}
              >
                {key === "library" ? "Library" : "Drill"}
              </button>
            ))}
          </div>
        </header>
        <div
          className="arena-body"
          role="tabpanel"
          id="arena-tabpanel"
          aria-labelledby={`arena-tab-${tab}`}
        >
          {tab === "library" ? (
            <>
              <div className="arena-grid">
                {seals.map((seal) => (
                  <button
                    key={seal.id}
                    className={`arena-tile ${seal.id === selected ? "selected" : ""}`}
                    aria-pressed={seal.id === selected}
                    onClick={() => setSelected(seal.id)}
                  >
                    <b lang="ja" aria-hidden="true">
                      {glyphFor(seal.id)}
                    </b>
                    <span>{seal.name}</span>
                    <i
                      className={calibrated(seal.id) ? "cal-ok" : ""}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <div className="arena-howto">
                <b>
                  <span lang="ja">{glyphFor(selected)}</span> How to:{" "}
                  {name(selected)}
                </b>
                <p>{sealGuides[selected].how}</p>
                <small>
                  {calibrated(selected)
                    ? `Taught for the camera · ${model.samples[selected]} samples`
                    : "Not taught for the camera yet. Practise it in Camera mode to teach it hands-free."}
                </small>
              </div>
            </>
          ) : (
            <>
              <div className="arena-hud">
                <div className="arena-time">
                  <SevenSegment
                    value={Math.min(elapsed, 99.9).toFixed(1).padStart(4, "0")}
                    label="Elapsed seconds"
                  />
                  <span>S</span>
                </div>
                <dl>
                  <div>
                    <dt>Round</dt>
                    <dd>
                      {Math.min(
                        answered + (phase === "running" ? 1 : 0),
                        DRILL_LENGTH,
                      )}
                      /{DRILL_LENGTH}
                    </dd>
                  </div>
                  <div>
                    <dt>Streak</dt>
                    <dd>{streak}</dd>
                  </div>
                  <div>
                    <dt>Accuracy</dt>
                    <dd>{accuracy}%</dd>
                  </div>
                  <div>
                    <dt>Best</dt>
                    <dd>
                      {best
                        ? `${best.correct}/${best.total} · ${best.time.toFixed(1)}s`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="arena-prompt" role="status">
                {phase === "running"
                  ? feedback
                    ? feedback.ok
                      ? `Correct: ${name(target)}`
                      : `Missed. That was ${name(target)}.`
                    : live
                      ? `Perform ${name(target)}, or tap the matching seal.`
                      : "Which seal is shown in the reticle?"
                  : phase === "done" && result
                    ? `${result.correct}/${result.total} in ${result.time.toFixed(1)} s${result.record ? " · new best" : ""}`
                    : "Ten seals, one at a time. Name each from its hand diagram."}
              </p>
              {phase === "running" ? (
                <div className="arena-grid">
                  {seals.map((seal) => (
                    <button
                      key={seal.id}
                      className={`arena-tile ${drillState(seal.id)}`}
                      aria-label={`Answer: ${seal.name}`}
                      onClick={() => answer(seal.id)}
                    >
                      <b lang="ja" aria-hidden="true">
                        {glyphFor(seal.id)}
                      </b>
                      <span>{seal.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button className="preview-button arena-begin" onClick={begin}>
                  {phase === "done" ? "Run it again" : "Begin sync test"}
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
