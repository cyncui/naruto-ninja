import { useCallback, useEffect, useRef, useState } from "react";
import AppView from "./AppView";
import { catalogue } from "../docs/data/catalogue";
import type { AppModel, TechniqueOption } from "./app-model";
import {
  diagnose,
  features,
  MATCH_LIMIT,
  readTemplates,
  sameDiagnosis,
  STORAGE_KEY,
} from "./runtime/recognition";
import type { Diagnosis, Templates } from "./runtime/recognition";
import { rms, SteadyCapture, TEACH_SAMPLES } from "./runtime/teach";
import {
  compactEmbedding,
  cosineDistance,
  diagnoseEmbedding,
  IMAGE_MATCH_LIMIT,
  IMAGE_STORAGE_KEY,
  readEmbeddings,
} from "./runtime/embedding";
import type { CropSource } from "./runtime/crop";
import { advanceSequence, StableSeal } from "./runtime/sequence";
import { useCamera } from "./runtime/useCamera";
import type { TrackingFrame } from "./runtime/useCamera";
import Stage, { effectFor } from "./runtime/Stage";
import { sealGuides } from "./seal-guide";
import { checkPose, samePoseCheck } from "./pose/feedback";
import type { PoseCheck } from "./pose/feedback";
import RecordPanel from "./RecordPanel";
import { NONE_LABELS } from "./runtime/recording";
import type { SessionRecorder } from "./runtime/recording";

const seals = catalogue.signs.map(({ id, name, aliases, sourceIds }) => ({
  id,
  name,
  aliases,
  sourceUrl:
    catalogue.sources.find((source) => source.id === sourceIds[0])?.url ?? "",
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
const MATCHER_KEY = "naruto-ninja.matcher";
type Matcher = "landmarks" | "image";
// Experimental: ?matcher=image switches to the image-embedding matcher and is
// remembered; ?matcher=landmarks switches back.
function readMatcher(): Matcher {
  try {
    const param = new URLSearchParams(location.search).get("matcher");
    if (param === "image" || param === "landmarks")
      localStorage.setItem(MATCHER_KEY, param);
    return localStorage.getItem(MATCHER_KEY) === "image"
      ? "image"
      : "landmarks";
  } catch {
    return "landmarks";
  }
}
// ?record shows the data-collection panel. Not remembered between visits.
const recordMode = new URLSearchParams(location.search).has("record");
const recordLabels = [
  ...seals.filter((seal) => staticSeals.has(seal.id)).map((seal) => seal.id),
  ...NONE_LABELS,
];
const calibrationKey = (matcher: Matcher) =>
  matcher === "image" ? IMAGE_STORAGE_KEY : STORAGE_KEY;
function loadCalibration(matcher: Matcher) {
  try {
    const raw = localStorage.getItem(calibrationKey(matcher));
    return matcher === "image"
      ? readEmbeddings(raw, staticSeals)
      : readTemplates(raw, staticSeals);
  } catch {
    return {};
  }
}

export default function App() {
  const [selected, setSelected] = useState(initialTechnique);
  const [variantId, setVariantId] = useState(initialTechnique.variants[0].id);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [mode, setMode] = useState<AppModel["mode"]>("demo");
  const [activeEffect, setActiveEffect] = useState(false);
  const [mirrored, setMirrored] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [status, setStatus] = useState(
    "Untimed rehearsal. Tap the numbered seals in order.",
  );
  const [matcher] = useState(readMatcher);
  const [templates, setTemplates] = useState<Templates>(() =>
    loadCalibration(matcher),
  );
  const [crop, setCrop] = useState<CropSource | undefined>();
  const [teaching, setTeaching] = useState<{
    seal: string;
    count: number;
    hold: number;
    waiting: boolean;
  } | null>(null);
  // Frame-to-frame steadiness thresholds are starting guesses, not measured.
  const steady = useRef(
    matcher === "image"
      ? new SteadyCapture(0.06, cosineDistance)
      : new SteadyCapture(0.08, rms),
  );
  const teachingRef = useRef(false);
  // The pose of the step just accepted. Teaching the next seal waits until the
  // hands move away from it, so a lingering seal is not saved as the next one.
  const releaseFrom = useRef<number[] | null>(null);
  const poseDistance = matcher === "image" ? cosineDistance : rms;
  const releaseLimit = matcher === "image" ? IMAGE_MATCH_LIMIT : MATCH_LIMIT;
  const calibrationOpen = useRef(false);
  const templatesRef = useRef(templates);
  templatesRef.current = templates;
  const [handsDetected, setHandsDetected] = useState(0);
  const [detectedSeal, setDetectedSeal] = useState<string | null>(null);
  const [match, setMatch] = useState<Diagnosis>({ reason: "no-hands" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const tracking = useRef<TrackingFrame>({ hands: [], face: [], aspect: 1 });
  const frameAt = useRef(0);
  const stable = useRef(new StableSeal());
  const recorder = useRef<SessionRecorder | null>(null);
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
  // In the arena, recognized seals answer the drill instead of the sequence.
  const arenaListener = useRef<((id: string) => void) | null>(null);
  const arenaFocus = useRef<string | null>(null);
  const [poseCheck, setPoseCheck] = useState<PoseCheck | null>(null);
  const teachRef = useRef<(id: string, sample: number[]) => void>(() => {});
  const variant = selected.variants.find((v) => v.id === variantId)!;
  const practice = useRef({ steps: [] as string[], mode });
  practice.current = { steps: variant.steps ?? [], mode };
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
      setStatus(`${selected.name}: sequence complete. Effect playing.`);
    } else {
      setStatus(
        (next.correct
          ? `${seals.find((s) => s.id === id)?.name} accepted. Next: ${sequence[next.progress].name}.`
          : `Out of order. ${next.progress ? "First seal accepted." : "Start again."} Next: ${sequence[next.progress].name}.`) +
          (next.progress
            ? mode === "demo"
              ? " Untimed rehearsal."
              : " An 8-second pause resets practice."
            : ""),
      );
      if (next.progress && mode === "camera")
        sequenceTimer.current = setTimeout(function expire() {
          // Teaching a seal or calibrating is not a pause in practice.
          if (teachingRef.current || calibrationOpen.current) {
            sequenceTimer.current = setTimeout(expire, 8000);
            return;
          }
          progressRef.current = 0;
          setProgress(0);
          stable.current = new StableSeal();
          setStatus("Sequence timed out after 8 seconds. Start again.");
        }, 8000);
    }
  };
  inputRef.current = inputSeal;
  const onFrame = useCallback(
    (frame: TrackingFrame) => {
      tracking.current = frame;
      frameAt.current = performance.now();
      setHandsDetected(frame.hands.length);
      setCrop(frame.crop);
      const diagnosis =
        matcher === "image"
          ? diagnoseEmbedding(frame.embedding, templatesRef.current)
          : diagnose(frame.hands, frame.aspect, templatesRef.current);
      setMatch((previous) =>
        sameDiagnosis(previous, diagnosis) ? previous : diagnosis,
      );
      const label = diagnosis.reason === "match" ? diagnosis.best : null;
      setDetectedSeal(
        label ? (seals.find((seal) => seal.id === label)?.name ?? label) : null,
      );
      const now = performance.now();
      // Recording keeps the live readout but must not teach or advance practice.
      if (recordMode) {
        recorder.current?.frame(frame, now);
        return;
      }
      const { steps, mode } = practice.current;
      const next = steps[progressRef.current % Math.max(1, steps.length)];
      const known = next ? (templatesRef.current[next]?.length ?? 0) : 0;
      // Compare the hands with the reference pose of the seal being practised.
      const focus =
        mode === "arena" ? arenaFocus.current : mode === "camera" ? next : null;
      const check = focus ? checkPose(focus, frame.hands, frame.aspect) : null;
      setPoseCheck((previous) =>
        samePoseCheck(previous, check) ? previous : check,
      );
      teachingRef.current =
        mode === "camera" &&
        !!next &&
        staticSeals.has(next) &&
        known < TEACH_SAMPLES &&
        !capturing.current &&
        !calibrationOpen.current;
      const vector =
        matcher === "image"
          ? frame.embedding
          : features(frame.hands, frame.aspect);
      const previousPose = releaseFrom.current;
      if (
        !vector ||
        !previousPose ||
        vector.length !== previousPose.length ||
        poseDistance(vector, previousPose) > releaseLimit
      )
        releaseFrom.current = null;
      if (teachingRef.current) {
        const waiting = releaseFrom.current !== null;
        const { hold, sample } = waiting
          ? (steady.current.reset(), { hold: 0, sample: null })
          : steady.current.update(vector, now);
        const shown = Math.round(hold * 10) / 10;
        setTeaching((previous) =>
          previous?.seal === next &&
          previous.count === known &&
          previous.hold === shown &&
          previous.waiting === waiting
            ? previous
            : { seal: next, count: known, hold: shown, waiting },
        );
        if (sample) teachRef.current(next, sample);
        return;
      }
      steady.current.reset();
      setTeaching(null);
      const accepted = stable.current.update(label, now);
      if (accepted && !capturing.current) {
        releaseFrom.current = vector ?? null;
        if (mode === "arena") arenaListener.current?.(accepted);
        else inputRef.current(accepted);
      }
    },
    [matcher],
  );
  const camera = useCamera(
    videoRef,
    onFrame,
    activeEffect &&
      (effect.type === "eyes" ||
        effect.type === "pale-eyes" ||
        effect.type === "markings"),
    matcher === "image" || recordMode,
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
    templatesRef.current = next;
    setTemplates(next);
    try {
      localStorage.setItem(calibrationKey(matcher), JSON.stringify(next));
      return true;
    } catch {
      setStatus(
        "Calibration works for this session, but this browser could not save it.",
      );
      return false;
    }
  };
  teachRef.current = (id, sample) => {
    const name = seals.find((s) => s.id === id)?.name ?? id;
    const stored = matcher === "image" ? compactEmbedding(sample) : sample;
    const next = {
      ...templatesRef.current,
      [id]: [...(templatesRef.current[id] ?? []), stored].slice(-12),
    };
    saveTemplates(next);
    if (next[id].length < TEACH_SAMPLES) {
      setStatus(
        `Learning ${name}: ${next[id].length} of ${TEACH_SAMPLES} samples. Keep holding.`,
      );
      return;
    }
    // The pose being held is the seal just taught: accept the step and keep
    // the matcher from firing it again until the hands release.
    stable.current.hold(id, performance.now());
    releaseFrom.current = sample;
    inputRef.current(id);
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
      `Capturing ${seals.find((s) => s.id === id)?.name} in ${seconds}… Hold the seal in frame.`,
    );
    captureTimer.current = setInterval(() => {
      seconds--;
      if (seconds) {
        setStatus(`Capturing in ${seconds}… Hold your seal still.`);
        return;
      }
      clearInterval(captureTimer.current);
      capturing.current = false;
      const frame = tracking.current;
      const fresh = performance.now() - frameAt.current < 500;
      const vector = !fresh
        ? null
        : matcher === "image"
          ? frame.embedding?.length
            ? compactEmbedding(frame.embedding)
            : null
          : features(frame.hands, frame.aspect);
      if (!vector) {
        setStatus(
          matcher === "image" && fresh
            ? "The image matcher is still loading. Capture again in a moment."
            : "Could not see your hands. Keep the seal in frame and capture again.",
        );
        return;
      }
      const next = {
        ...templatesRef.current,
        [id]: [...(templatesRef.current[id] ?? []), vector].slice(-12),
      };
      if (saveTemplates(next))
        setStatus(
          `Saved ${next[id].length} sample${next[id].length === 1 ? "" : "s"} for ${seals.find((s) => s.id === id)?.name} (${matcher === "image" ? `image crop: ${frame.crop ?? "center"}` : `tracked as ${vector.length === 42 ? "1 hand" : "2 hands"}`}). Capture at least 3 with small pose variations.`,
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
        figure={
          mode !== "arena" &&
          (activeEffect || !sealGuides[sequence[progress]?.id])
        }
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
    match,
    matcher,
    crop,
    teaching,
    setCalibrationOpen: (open: boolean) => {
      calibrationOpen.current = open;
    },
    samples: Object.fromEntries(
      Object.entries(templates).map(([id, examples]) => [id, examples.length]),
    ),
    activeEffect,
    effectName: effect.name,
    mirrored,
    reducedMotion,
    status,
    startCamera: () => {
      if (mode !== "arena") setMode("camera");
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
      setStatus(
        next === "demo"
          ? "Untimed rehearsal. Tap the numbered seals in order."
          : next === "arena"
            ? "Arena: study each seal in the library, or test yourself in the drill."
            : "Start the camera, then use Calibration to teach each seal.",
      );
    },
    poseCheck,
    setArenaFocus: (id) => {
      arenaFocus.current = id;
    },
    onArenaSeal: (listener) => {
      arenaListener.current = listener;
      return () => {
        if (arenaListener.current === listener) arenaListener.current = null;
      };
    },
    selectTechnique: (id) => {
      const next = techniques.find((t) => t.id === id);
      if (!next) return;
      resetSequence();
      setSelected(next);
      setVariantId(next.variants[0].id);
      setStatus(
        next.variants[0].steps?.length
          ? "Technique selected. Tap the seals in order."
          : "Technique selected. Preview its effect below.",
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
  return (
    <>
      <AppView model={model} />
      {recordMode && (
        <RecordPanel
          model={model}
          recorder={recorder}
          labels={recordLabels}
          matcher={matcher}
        />
      )}
    </>
  );
}
