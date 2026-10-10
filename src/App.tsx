import { useCallback, useEffect, useRef, useState } from "react";
import AppView from "./AppView";
import { catalogue } from "../docs/data/catalogue";
import type { AppModel, TechniqueOption } from "./app-model";
import {
  classify,
  features,
  readTemplates,
  STORAGE_KEY,
} from "./runtime/recognition";
import type { Templates } from "./runtime/recognition";
import { advanceSequence, StableSeal } from "./runtime/sequence";
import { useCamera } from "./runtime/useCamera";
import type { TrackingFrame } from "./runtime/useCamera";
import Stage, { effectFor } from "./runtime/Stage";

const seals = catalogue.signs.map(({ id, name, aliases }) => ({
  id,
  name,
  aliases,
}));
const staticSeals = new Set(
  catalogue.signs
    .filter((sign) => sign.kind !== "action")
    .map((sign) => sign.id),
);
const techniques: TechniqueOption[] = catalogue.techniques.map((technique) => ({
  id: technique.id,
  name: technique.name,
  nature: technique.nature,
  family:
    technique.associations
      .filter((a) => a.kind === "clan")
      .map((a) => a.name)
      .join(" / ") ||
    (technique.category === "elemental"
      ? "Elemental arts"
      : "Shared techniques"),
  variants: technique.variants.map((variant) => ({
    id: variant.id,
    label: variant.label,
    steps: variant.steps,
    kind: variant.triggerKind,
    evidence: variant.verificationStatus,
    sourceUrl:
      catalogue.sources.find((source) => source.id === variant.sourceIds[0])
        ?.url ?? "",
    notes: variant.notes,
  })),
}));
const initialTechnique = techniques.find(
  (t) => t.id === "fire-great-fireball",
)!;
function loadCalibration() {
  try {
    return readTemplates(localStorage.getItem(STORAGE_KEY), staticSeals);
  } catch {
    return {};
  }
}

export default function App() {
  const [selected, setSelected] = useState(initialTechnique);
  const [variantId, setVariantId] = useState(initialTechnique.variants[0].id);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [mode, setMode] = useState<"demo" | "camera">("demo");
  const [activeEffect, setActiveEffect] = useState(false);
  const [mirrored, setMirrored] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [status, setStatus] = useState(
    "Practice the seals in order, or preview the effect.",
  );
  const [templates, setTemplates] = useState<Templates>(loadCalibration);
  const templatesRef = useRef(templates);
  templatesRef.current = templates;
  const [handsDetected, setHandsDetected] = useState(0);
  const [detectedSeal, setDetectedSeal] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tracking = useRef<TrackingFrame>({ hands: [], face: [], aspect: 1 });
  const frameAt = useRef(0);
  const stable = useRef(new StableSeal());
  const effectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const captureTimer = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const capturing = useRef(false);
  const inputRef = useRef<(id: string) => void>(() => {});
  const variant = selected.variants.find((v) => v.id === variantId)!;
  const sequence = (variant.steps ?? []).map(
    (id) => seals.find((seal) => seal.id === id)!,
  );
  const effect = effectFor(selected.id, selected.nature);

  const previewEffect = useCallback(() => {
    clearTimeout(effectTimer.current);
    setActiveEffect(true);
    effectTimer.current = setTimeout(() => setActiveEffect(false), 6500);
  }, []);
  const resetSequence = useCallback(() => {
    clearTimeout(sequenceTimer.current);
    clearTimeout(effectTimer.current);
    clearInterval(captureTimer.current);
    capturing.current = false;
    progressRef.current = 0;
    setProgress(0);
    setActiveEffect(false);
    stable.current = new StableSeal();
    setStatus("Sequence reset. Begin with the first seal.");
  }, []);
  const inputSeal = (id: string) => {
    if (!variant.steps?.length) {
      setStatus(
        "This technique has no known practice sequence. Use effect preview.",
      );
      return;
    }
    clearTimeout(sequenceTimer.current);
    const previous =
      progressRef.current === variant.steps.length ? 0 : progressRef.current;
    const next = advanceSequence(variant.steps, previous, id);
    progressRef.current = next.progress;
    setProgress(next.progress);
    if (next.complete) {
      previewEffect();
      setStatus(`${selected.name} — sequence complete. Effect playing.`);
    } else {
      setStatus(
        next.correct
          ? `${seals.find((s) => s.id === id)?.name} accepted. Next: ${sequence[next.progress].name}.`
          : `Out of order. ${next.progress ? "First seal accepted." : "Start again."} Next: ${sequence[next.progress].name}.`,
      );
      if (next.progress)
        sequenceTimer.current = setTimeout(() => {
          progressRef.current = 0;
          setProgress(0);
          stable.current = new StableSeal();
          setStatus("Sequence timed out after 8 seconds. Start again.");
        }, 8000);
    }
  };
  inputRef.current = inputSeal;
  const onFrame = useCallback((frame: TrackingFrame) => {
    tracking.current = frame;
    frameAt.current = performance.now();
    setHandsDetected(frame.hands.length);
    const label = classify(
      features(frame.hands, frame.aspect),
      templatesRef.current,
    );
    setDetectedSeal(
      label ? (seals.find((seal) => seal.id === label)?.name ?? label) : null,
    );
    const accepted = stable.current.update(label, performance.now());
    if (accepted && !capturing.current) inputRef.current(accepted);
  }, []);
  const camera = useCamera(
    videoRef,
    onFrame,
    activeEffect &&
      (effect.type === "eyes" ||
        effect.type === "pale-eyes" ||
        effect.type === "markings"),
  );

  useEffect(
    () => () => {
      clearTimeout(effectTimer.current);
      clearTimeout(sequenceTimer.current);
      clearInterval(captureTimer.current);
    },
    [],
  );
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReducedMotion(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  const saveTemplates = (next: Templates) => {
    setTemplates(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch {
      setStatus(
        "Calibration works for this session, but this browser could not save it.",
      );
      return false;
    }
  };
  const calibrate = (id: string) => {
    if (capturing.current) return;
    if (!staticSeals.has(id)) {
      setStatus(
        "Movement gestures need a temporal model. Practice this step manually.",
      );
      return;
    }
    if (camera.cameraStatus !== "live" || camera.trackerStatus !== "ready") {
      setStatus("Start the camera and wait for tracking before capturing.");
      return;
    }
    capturing.current = true;
    let seconds = 3;
    setStatus(
      `Capturing ${seals.find((s) => s.id === id)?.name} in ${seconds}… Hold both hands in frame.`,
    );
    captureTimer.current = setInterval(() => {
      seconds--;
      if (seconds) {
        setStatus(`Capturing in ${seconds}… Hold your seal still.`);
        return;
      }
      clearInterval(captureTimer.current);
      capturing.current = false;
      const vector =
        performance.now() - frameAt.current < 500
          ? features(tracking.current.hands, tracking.current.aspect)
          : null;
      if (!vector) {
        setStatus(
          "Could not see both hands clearly. Separate them slightly and capture again.",
        );
        return;
      }
      const next = {
        ...templatesRef.current,
        [id]: [...(templatesRef.current[id] ?? []), vector].slice(-12),
      };
      if (saveTemplates(next))
        setStatus(
          `Saved ${next[id].length} sample${next[id].length === 1 ? "" : "s"} for ${seals.find((s) => s.id === id)?.name}. Capture at least 3 with small pose variations.`,
        );
      stable.current = new StableSeal();
    }, 1000);
  };

  const model: AppModel = {
    stage: (
      <Stage
        videoRef={videoRef}
        tracking={tracking}
        live={camera.cameraStatus === "live"}
        mirrored={mirrored}
        active={activeEffect}
        effect={effect.type}
        reducedMotion={reducedMotion}
      />
    ),
    techniques,
    seals,
    selected,
    variantId,
    sequence,
    progress,
    mode,
    cameraStatus: camera.cameraStatus,
    cameraMessage: camera.cameraMessage,
    trackerStatus: camera.trackerStatus,
    trackerMessage: camera.trackerMessage,
    handsDetected,
    faceStatus: camera.faceStatus,
    detectedSeal,
    samples: Object.fromEntries(
      Object.entries(templates).map(([id, examples]) => [id, examples.length]),
    ),
    activeEffect,
    effectName: effect.name,
    mirrored,
    reducedMotion,
    status,
    startCamera: () => {
      setMode("camera");
      resetSequence();
      void camera.startCamera();
    },
    stopCamera: () => {
      camera.stopCamera();
      resetSequence();
    },
    setMode: (next) => {
      if (next === "demo") camera.stopCamera();
      resetSequence();
      setMode(next);
    },
    selectTechnique: (id) => {
      const next = techniques.find((t) => t.id === id);
      if (!next) return;
      resetSequence();
      setSelected(next);
      setVariantId(next.variants[0].id);
      setStatus(
        `Selected ${next.name}. ${next.variants[0].steps?.length ? "Practice its seals in order." : "Effect preview is available."}`,
      );
    },
    selectVariant: (id) => {
      if (selected.variants.some((v) => v.id === id)) {
        resetSequence();
        setVariantId(id);
      }
    },
    inputSeal,
    resetSequence,
    previewEffect: () => {
      previewEffect();
      setStatus(
        `${effect.name} preview. This does not count as a recognized sequence.`,
      );
    },
    calibrate,
    clearCalibration: () => {
      clearInterval(captureTimer.current);
      capturing.current = false;
      if (saveTemplates({}))
        setStatus("All personal calibration samples cleared.");
      stable.current = new StableSeal();
    },
    toggleMirror: () => setMirrored((value) => !value),
    toggleReducedMotion: () => setReducedMotion((value) => !value),
  };
  return <AppView model={model} />;
}
