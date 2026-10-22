import { useEffect, useRef, useState } from "react";
import type { AppModel } from "./app-model";
import SealRing from "./SealRing";
import type { MarkerState, RingSeal } from "./SealRing";
import SevenSegment from "./SevenSegment";
import Corrections from "./Corrections";
import { sealGuides } from "./seal-guide";
import { glyphFor, glyphs } from "./seals";
import { TEACH_SAMPLES } from "./runtime/teach";
import { BEST_KEY, DRILL_LENGTH, isBetter, makeQueue, readBest } from "./drill";
import type { DrillResult } from "./drill";

type Tab = "library" | "drill";
type Phase = "idle" | "running" | "done";
type Feedback = { id: string; ok: boolean };
type Drill = ReturnType<typeof useDrill>;

const nameOf = (seals: RingSeal[], id: string) =>
  seals.find((s) => s.id === id)?.name ?? id;

function loadBest() {
  try {
    return readBest(localStorage.getItem(BEST_KEY));
  } catch {
    return null;
  }
}

function saveBest(round: DrillResult) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(round));
  } catch {}
}

/** Tally for the round in progress. */
interface Score {
  correct: number;
  answered: number;
  streak: number;
}
const freshScore: Score = { correct: 0, answered: 0, streak: 0 };

/** The timed recognition drill: a queue of seals, answers and the best round. */
function useDrill(ids: string[]) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(freshScore);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
    setQueue(makeQueue(ids));
    setIndex(0);
    setScore(freshScore);
    setFeedback(null);
    setResult(null);
    setElapsed(0);
    setStartedAt(performance.now());
    setPhase("running");
  };
  const finish = (correct: number) => {
    const time = (performance.now() - startedAt) / 1000;
    const round = { correct, total: DRILL_LENGTH, time };
    const record = isBetter(round, best);
    if (record) {
      setBest(round);
      saveBest(round);
    }
    setElapsed(time);
    setResult({ ...round, record });
    setPhase("done");
  };
  const answer = (id: string) => {
    if (phase !== "running" || feedback) return;
    const ok = id === target;
    const correct = score.correct + (ok ? 1 : 0);
    setFeedback({ id, ok });
    setScore({
      correct,
      answered: score.answered + 1,
      streak: ok ? score.streak + 1 : 0,
    });
    // A miss holds a little longer so the right answer can be seen.
    advance.current = setTimeout(
      () => {
        setFeedback(null);
        if (index + 1 >= queue.length) finish(correct);
        else setIndex(index + 1);
      },
      ok ? 450 : 1100,
    );
  };
  const stateOf = (id: string): MarkerState => {
    if (!feedback) return "";
    if (id === target) return "right";
    return id === feedback.id ? "wrong" : "";
  };
  return {
    phase,
    target,
    ...score,
    elapsed,
    feedback,
    best,
    result,
    begin,
    answer,
    stateOf,
  };
}

function drillCaption(
  drill: Drill,
  live: boolean,
  seal: (id: string) => string,
) {
  if (drill.phase === "done") return "Round complete";
  if (drill.phase !== "running") return "Begin a 10-seal sync test";
  return live
    ? `Perform ${glyphFor(drill.target)} ${seal(drill.target)}, or tap its tile`
    : "Identify this seal: tap its tile or ring marker";
}

function drillPrompt(
  drill: Drill,
  live: boolean,
  seal: (id: string) => string,
) {
  const { phase, feedback, result, target } = drill;
  if (phase === "done" && result)
    return `${result.correct}/${result.total} in ${result.time.toFixed(1)} s${result.record ? " · new best" : ""}`;
  if (phase !== "running")
    return "Ten seals, one at a time. Name each from its hand diagram.";
  if (feedback)
    return feedback.ok
      ? `Correct: ${seal(target)}`
      : `Missed. That was ${seal(target)}.`;
  return live
    ? `Perform ${seal(target)}, or tap the matching seal.`
    : "Which seal is shown in the reticle?";
}

/** Practice arena: a library of the twelve seals and a timed recognition drill. */
export default function Arena({ model }: { model: AppModel }) {
  const seals = Object.keys(glyphs).flatMap((id) => {
    const found = model.seals.find((s) => s.id === id);
    return found ? [found] : [];
  });
  const live = model.cameraStatus === "live";
  const [tab, setTab] = useState<Tab>("library");
  const [selected, setSelected] = useState(seals[0].id);
  const drill = useDrill(seals.map((s) => s.id));

  const answerRef = useRef(drill.answer);
  answerRef.current = drill.answer;
  const subscribe = model.onArenaSeal;
  useEffect(
    () => subscribe((id) => tab === "drill" && answerRef.current(id)),
    [subscribe, tab],
  );

  // Camera feedback checks the seal the arena is showing.
  const focus =
    tab === "library"
      ? selected
      : drill.phase === "running"
        ? drill.target
        : null;
  const setFocus = model.setArenaFocus;
  useEffect(() => {
    setFocus(focus ?? null);
    return () => setFocus(null);
  }, [focus, setFocus]);

  return (
    <>
      {tab === "library" ? (
        <LibraryRing
          model={model}
          seals={seals}
          selected={selected}
          onSelect={setSelected}
        />
      ) : (
        <DrillRing model={model} seals={seals} drill={drill} />
      )}
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
            <LibraryTab
              model={model}
              seals={seals}
              selected={selected}
              onSelect={setSelected}
            />
          ) : (
            <DrillTab seals={seals} drill={drill} live={live} />
          )}
        </div>
      </section>
    </>
  );
}

/** Joint ids the camera says are off, for highlighting on the hand model. */
function liveIssues(model: AppModel) {
  if (model.cameraStatus !== "live" || !model.poseCheck) return undefined;
  return new Set(model.poseCheck.issues.flatMap((issue) => issue.digits));
}

const calibrated = (model: AppModel, id: string) =>
  (model.samples[id] ?? 0) >= TEACH_SAMPLES;

interface LibraryProps {
  model: AppModel;
  seals: RingSeal[];
  selected: string;
  onSelect: (id: string) => void;
}

function LibraryRing({ model, seals, selected, onSelect }: LibraryProps) {
  const live = model.cameraStatus === "live";
  const name = nameOf(seals, selected);
  return (
    <SealRing
      seals={seals}
      stateOf={(i) => (seals[i].id === selected ? "next" : "")}
      focusIndex={seals.findIndex((s) => s.id === selected)}
      progress={0}
      turns={0}
      figure={{
        sealId: selected,
        issues: liveIssues(model),
        label: `3D hand model of the ${name} seal`,
        still: model.reducedMotion,
      }}
      still={model.reducedMotion || live}
      onPick={(picked) => onSelect(picked.id)}
      pickLabel={(picked) => `Show ${picked.name}`}
      caption={
        live ? (
          <Corrections
            check={model.poseCheck}
            title={`${glyphFor(selected)} ${name}`}
            how={sealGuides[selected].how}
          />
        ) : (
          `${glyphFor(selected)} ${name} · mirror view · drag to turn`
        )
      }
      className="arena-ring"
    />
  );
}

function DrillRing({
  model,
  seals,
  drill,
}: {
  model: AppModel;
  seals: RingSeal[];
  drill: Drill;
}) {
  const running = drill.phase === "running";
  return (
    <SealRing
      seals={seals}
      stateOf={(i) => drill.stateOf(seals[i].id)}
      focusIndex={-1}
      progress={drill.phase === "idle" ? 0 : drill.answered / DRILL_LENGTH}
      turns={drill.answered}
      figure={
        running && drill.target
          ? {
              sealId: drill.target,
              issues: liveIssues(model),
              label: "3D hand model of the seal to identify",
              still: model.reducedMotion,
            }
          : undefined
      }
      still={model.reducedMotion || model.cameraStatus === "live"}
      onPick={running ? (picked) => drill.answer(picked.id) : undefined}
      pickLabel={(picked) => `Ring answer: ${picked.name}`}
      caption={drillCaption(drill, model.cameraStatus === "live", (id) =>
        nameOf(seals, id),
      )}
      className="arena-ring"
    />
  );
}

function LibraryTab({ model, seals, selected, onSelect }: LibraryProps) {
  return (
    <>
      <div className="arena-grid">
        {seals.map(({ id, name }) => (
          <button
            key={id}
            className={`arena-tile ${id === selected ? "selected" : ""}`}
            aria-pressed={id === selected}
            onClick={() => onSelect(id)}
          >
            <b lang="ja" aria-hidden="true">
              {glyphFor(id)}
            </b>
            <span>{name}</span>
            <i
              className={calibrated(model, id) ? "cal-ok" : ""}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <div className="arena-howto">
        <b>
          <span lang="ja">{glyphFor(selected)}</span> How to:{" "}
          {nameOf(seals, selected)}
        </b>
        <p>{sealGuides[selected].how}</p>
        <small>
          {calibrated(model, selected)
            ? `Taught for the camera · ${model.samples[selected]} samples`
            : "Not taught for the camera yet. Practise it in Camera mode to teach it hands-free."}
        </small>
      </div>
    </>
  );
}

function DrillHud({ drill }: { drill: Drill }) {
  const { answered, correct, best } = drill;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const round = Math.min(
    answered + (drill.phase === "running" ? 1 : 0),
    DRILL_LENGTH,
  );
  return (
    <div className="arena-hud">
      <div className="arena-time">
        <SevenSegment
          value={Math.min(drill.elapsed, 99.9).toFixed(1).padStart(4, "0")}
          label="Elapsed seconds"
        />
        <span>S</span>
      </div>
      <dl>
        <div>
          <dt>Round</dt>
          <dd>
            {round}/{DRILL_LENGTH}
          </dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{drill.streak}</dd>
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
  );
}

function DrillTab({
  seals,
  drill,
  live,
}: {
  seals: RingSeal[];
  drill: Drill;
  live: boolean;
}) {
  return (
    <>
      <DrillHud drill={drill} />
      <p className="arena-prompt" role="status">
        {drillPrompt(drill, live, (id) => nameOf(seals, id))}
      </p>
      {drill.phase === "running" ? (
        <div className="arena-grid">
          {seals.map(({ id, name }) => (
            <button
              key={id}
              className={`arena-tile ${drill.stateOf(id)}`}
              aria-label={`Answer: ${name}`}
              onClick={() => drill.answer(id)}
            >
              <b lang="ja" aria-hidden="true">
                {glyphFor(id)}
              </b>
              <span>{name}</span>
            </button>
          ))}
        </div>
      ) : (
        <button className="preview-button arena-begin" onClick={drill.begin}>
          {drill.phase === "done" ? "Run it again" : "Begin sync test"}
        </button>
      )}
    </>
  );
}
