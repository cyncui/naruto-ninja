import { useEffect, useRef, useState } from "react";
import type { AppModel, Seal } from "./app-model";
import FloatingPanel from "./FloatingPanel";
import Icon from "./Icon";
import Scramble from "./Scramble";
import { sealGuides, sealGuideSource } from "./seal-guide";
import { glyphFor } from "./seals";
import { TEACH_SAMPLES } from "./runtime/teach";

const shortName = (name: string) =>
  name
    .replace(/^(Fire|Water|Wind|Earth|Lightning|Wood|Ice) Release: /, "")
    .replace(/ Technique$/, "")
    .replace(/[—–]/g, "-");
const evidenceText: Record<string, string> = {
  primary_verified: "Primary source verified.",
  unresolved: "Activation unresolved. No sequence verified.",
  secondary_reported: "Secondary-reported sequence. Not primary-verified.",
};

function panelSummary(
  model: AppModel,
  completed: boolean,
  currentSeal: Seal | undefined,
) {
  const total = model.sequence.length;
  if (!total) return "PREVIEW ONLY";
  if (completed) return `${total}/${total} · COMPLETE`;
  return `${model.progress}/${total} · NEXT ${currentSeal!.name.toUpperCase()}`;
}

/** The floating hand-sequence window: steps, status, notes and free practice. */
export default function SequencePanel({
  model,
  currentSeal,
  completed,
  openCatalogue,
}: {
  model: AppModel;
  currentSeal: Seal | undefined;
  completed: boolean;
  openCatalogue: () => void;
}) {
  // The sequence panel folds to its title bar while the camera is live; the
  // reticle and sync ratio carry progress. Each camera start folds it again.
  const [panelOpenLive, setPanelOpenLive] = useState(false);
  const cameraLive = model.cameraStatus === "live";
  useEffect(() => {
    if (cameraLive) setPanelOpenLive(false);
  }, [cameraLive]);
  const variant = model.selected.variants.find(
    (v) => v.id === model.variantId,
  )!;
  return (
    <FloatingPanel
      title="HAND SEQUENCE"
      jp="印契配列"
      collapsed={cameraLive && !panelOpenLive}
      onToggle={
        cameraLive ? () => setPanelOpenLive((open) => !open) : undefined
      }
      summary={panelSummary(model, completed, currentSeal)}
      footer={
        currentSeal?.sourceUrl ? (
          <>
            <a
              href={currentSeal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Scramble text="Seal reference" /> <Icon name="arrow" />
            </a>
            <span>Secondary source</span>
          </>
        ) : undefined
      }
    >
      <div className="sequence-content">
        <div className="technique-heading">
          <div>
            <span className="eyebrow">
              {model.selected.family}
              {model.selected.nature.length
                ? ` / ${model.selected.nature.join(" + ")}`
                : ""}
            </span>
            <h1 title={model.selected.name}>
              {shortName(model.selected.name)}
            </h1>
          </div>
          <button
            className="change-technique"
            onClick={() => openCatalogue()}
            aria-label="Change technique"
            title="Change technique"
          >
            <Icon name="arrow" />
          </button>
        </div>
        {model.sequence.length ? (
          <SequenceRail model={model} />
        ) : (
          <NoSequence kind={variant.kind} />
        )}
        <div className="practice-row">
          <div role="status">
            <strong>
              {completed
                ? "Practice complete."
                : currentSeal
                  ? `Next: ${currentSeal.name}`
                  : "Preview only"}
            </strong>
            <span>
              {model.sequence.length
                ? `${Math.min(model.progress, model.sequence.length)} of ${model.sequence.length} signs`
                : "No automatic casting"}
              {model.sequence.length > 4 && (
                <span
                  className={`rail-hint ${model.sequence.length > 6 ? "rail-hint-long" : ""}`}
                >
                  {" "}
                  · Scroll signs <Icon name="scroll" />
                </span>
              )}
            </span>
          </div>
          <button onClick={model.resetSequence}>
            <Icon name="reset" /> Reset
          </button>
        </div>
        <p className="runtime-status" role="status">
          {model.status}
        </p>
        {currentSeal && sealGuides[currentSeal.id] && (
          <p className="seal-howto">
            <b>
              <span lang="ja">{glyphFor(currentSeal.id)}</span> How to:{" "}
              {currentSeal.name}
            </b>
            {sealGuides[currentSeal.id].how}
          </p>
        )}
        <SourceNotes model={model} variant={variant} />
        <details className="free-practice">
          <summary>
            <Icon name="plus" className="toggle-icon" />
            Free seal practice
          </summary>
          <div className="seal-keyboard">
            {model.seals.map((seal) => (
              <button key={seal.id} onClick={() => model.inputSeal(seal.id)}>
                {seal.name}
              </button>
            ))}
          </div>
        </details>
      </div>
    </FloatingPanel>
  );
}

/** The numbered steps; the current one scrolls into view. */
function SequenceRail({ model }: { model: AppModel }) {
  const sequenceRail = useRef<HTMLOListElement>(null);
  useEffect(() => {
    sequenceRail.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [model.progress, model.selected.id, model.variantId]);
  const cameraPractice = model.mode === "camera";
  const calibrated = (id: string) => (model.samples[id] ?? 0) >= TEACH_SAMPLES;
  return (
    <ol ref={sequenceRail} className="sequence-rail">
      {model.sequence.map((seal, index) => (
        <li key={`${index}-${seal.id}`}>
          <button
            onClick={() => model.inputSeal(seal.id)}
            className={`seal-step ${index < model.progress ? "complete" : ""} ${index === model.progress ? "current" : ""} ${cameraPractice ? (calibrated(seal.id) ? "cal-ok" : "cal-missing") : ""}`}
            aria-current={index === model.progress ? "step" : undefined}
            aria-label={`Practice step ${index + 1}: ${String(index + 1).padStart(2, "0")} ${glyphFor(seal.id)} ${seal.name}`}
          >
            <span aria-hidden="true">
              {index < model.progress ? (
                <Icon name="check" />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <b className="seal-glyph" aria-hidden="true">
              {glyphFor(seal.id)}
            </b>
            <strong>{seal.name}</strong>
          </button>
        </li>
      ))}
    </ol>
  );
}

function NoSequence({ kind }: { kind: string }) {
  return (
    <div className="no-sequence">
      <strong>
        {kind === "no_seals"
          ? "No hand seals reported."
          : "The hand-sign sequence is unresolved."}
      </strong>
      <p>Effect preview is available below.</p>
    </div>
  );
}

function SourceNotes({
  model,
  variant,
}: {
  model: AppModel;
  variant: AppModel["selected"]["variants"][number];
}) {
  return (
    <details
      className="source-notes"
      onToggle={(event) => {
        if (event.currentTarget.open)
          event.currentTarget
            .querySelector("div")
            ?.scrollIntoView({ block: "start" });
      }}
    >
      <summary>
        Source & notes
        <span className="source-extra">
          {model.selected.variants.length > 1
            ? `${model.selected.variants.length} variants · `
            : ""}
          <Icon name="plus" className="toggle-icon" />
        </span>
      </summary>
      <div>
        {model.selected.variants.length > 1 && (
          <div className="variant-picker">
            <label htmlFor="variant-sequence">Sequence</label>
            <select
              id="variant-sequence"
              value={model.variantId}
              onChange={(e) => model.selectVariant(e.target.value)}
            >
              {model.selected.variants.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <p>
          {evidenceText[variant.evidence]}{" "}
          {variant.sourceUrl && (
            <a
              href={variant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Scramble text="View reference" /> <Icon name="arrow" />
            </a>
          )}
        </p>
        {variant.notes.map((note, i) => (
          <p key={i}>{note.replace(/[—–]/g, ", ")}</p>
        ))}
        <p>
          Click numbered signs to rehearse. Repeated signs are separate steps.
          Effect preview is a simulation, independent of completing practice.
        </p>
        <p>
          The 3D hand models are simplified reference poses estimated from the{" "}
          <a href={sealGuideSource} target="_blank" rel="noopener noreferrer">
            <Scramble text="databook seal chart" /> <Icon name="arrow" />
          </a>
          , not traced artwork; camera corrections compare your hands with them.
          Zodiac characters are labels only.
        </p>
      </div>
    </details>
  );
}
