import type { AppModel } from "./app-model";
import Corrections from "./Corrections";
import SealRing from "./SealRing";
import { sealGuides } from "./seal-guide";
import { glyphFor } from "./seals";

const notSeal: Record<string, string> = {
  "none:rest":
    "Not a seal · rest. Hands down and relaxed, in your lap or out of frame.",
  "none:transition":
    "Not a seal · transition. Move from one seal to the next without holding any.",
  "none:lookalike":
    "Not a seal · lookalike. Poses close to a seal that aren't one: a fist, prayer hands, loosely laced fingers.",
};

const liveIssues = (model: AppModel) =>
  model.cameraStatus === "live" && model.poseCheck
    ? new Set(model.poseCheck.issues.flatMap((issue) => issue.digits))
    : undefined;

function recordCaption(model: AppModel, focus: string, title: string) {
  const guide = sealGuides[focus];
  if (!guide)
    return notSeal[focus] ?? `${title} · no reference figure for this seal yet`;
  if (model.cameraStatus !== "live")
    return `${title} · mirror view · drag to turn`;
  return <Corrections check={model.poseCheck} title={title} how={guide.how} />;
}

/** ?record: the label being recorded, on a ring of the base seals. */
function RecordGuide({ model, focus }: { model: AppModel; focus: string }) {
  const live = model.cameraStatus === "live";
  const ring = model.seals.filter((seal) => sealGuides[seal.id]);
  const name = model.seals.find((s) => s.id === focus)?.name ?? focus;
  const guide = sealGuides[focus];
  const caption = recordCaption(model, focus, `${glyphFor(focus)} ${name}`);
  return (
    <SealRing
      seals={ring}
      stateOf={(index) => (ring[index].id === focus ? "next" : "")}
      focusIndex={ring.findIndex((s) => s.id === focus)}
      progress={0}
      turns={0}
      figure={
        guide
          ? {
              sealId: focus,
              issues: liveIssues(model),
              label: `3D hand model of the ${name} seal`,
              still: model.reducedMotion,
            }
          : undefined
      }
      still={model.reducedMotion || live}
      caption={caption}
    />
  );
}

/** The practice reticle for the selected technique's sequence. */
export default function TrainingSeal({ model }: { model: AppModel }) {
  if (model.recordFocus)
    return <RecordGuide model={model} focus={model.recordFocus} />;
  const live = model.cameraStatus === "live";
  const steps = model.sequence.length
    ? model.sequence
    : [{ id: "seal", name: "Preview" }];
  const current = model.sequence[model.progress];
  const guide =
    !model.activeEffect && current ? sealGuides[current.id] : undefined;
  const pickable = model.mode === "demo" && model.sequence.length > 0;
  const issues = liveIssues(model);
  return (
    <SealRing
      seals={steps}
      stateOf={(index) =>
        index < model.progress
          ? "accepted"
          : index === model.progress
            ? "next"
            : ""
      }
      focusIndex={model.progress}
      progress={
        model.sequence.length ? model.progress / model.sequence.length : 0
      }
      turns={model.progress}
      figure={
        guide
          ? {
              sealId: current.id,
              issues,
              label: `3D hand model of the ${current.name} seal`,
              still: model.reducedMotion,
            }
          : undefined
      }
      charged={model.activeEffect}
      still={model.reducedMotion || live}
      dataProgress={model.progress}
      onPick={pickable ? (seal) => model.inputSeal(seal.id) : undefined}
      pickLabel={(seal, index) => `Seal ring step ${index + 1}: ${seal.name}`}
      caption={
        guide && live ? (
          <Corrections
            check={model.poseCheck}
            title={`${glyphFor(current.id)} ${current.name}`}
            how={guide.how}
          />
        ) : guide ? (
          `${glyphFor(current.id)} ${current.name} · mirror view · drag to turn`
        ) : (
          "TARGET · original practice figure, not a pose reference"
        )
      }
    />
  );
}
