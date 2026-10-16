import type { AppModel } from "./app-model";
import SealRing from "./SealRing";
import { sealGuides } from "./seal-guide";
import { glyphFor } from "./seals";

/** The practice reticle for the selected technique's sequence. */
export default function TrainingSeal({ model }: { model: AppModel }) {
  const live = model.cameraStatus === "live";
  const steps = model.sequence.length
    ? model.sequence
    : [{ id: "seal", name: "Preview" }];
  const current = model.sequence[model.progress];
  const guide =
    !model.activeEffect && current ? sealGuides[current.id] : undefined;
  const pickable = model.mode === "demo" && model.sequence.length > 0;
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
      guide={guide}
      guideKey={current?.id}
      charged={model.activeEffect}
      still={model.reducedMotion || live}
      dataProgress={model.progress}
      onPick={pickable ? (seal) => model.inputSeal(seal.id) : undefined}
      pickLabel={(seal, index) => `Seal ring step ${index + 1}: ${seal.name}`}
      caption={
        guide && live
          ? `${glyphFor(current.id)} ${current.name}: ${guide.how}`
          : guide
            ? `${glyphFor(current.id)} ${current.name} · your view · simplified diagram`
            : "TARGET · original practice figure, not a pose reference"
      }
    />
  );
}
