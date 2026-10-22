import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
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

const sealName = (id: string) => seals.find((s) => s.id === id)?.name ?? id;
const faceEffects = new Set(["eyes", "pale-eyes", "markings"]);
const modeStatus: Record<AppModel["mode"], string> = {
  demo: "Untimed rehearsal. Tap the numbered seals in order.",
  arena:
    "Arena: study each seal in the library, or test yourself in the drill.",
  camera: "Start the camera, then use Calibration to teach each seal.",
};

/** Status line after a seal is entered mid-sequence. */
function stepStatus(
  next: { correct: boolean; progress: number },
  id: string,
  upcoming: string,
  mode: AppModel["mode"],
) {
  const head = next.correct
    ? `${seals.find((s) => s.id === id)?.name} accepted.`
    : `Out of order. ${next.progress ? "First seal accepted." : "Start again."}`;
  const pause = !next.progress
    ? ""
    : mode === "demo"
      ? " Untimed rehearsal."
      : " An 8-second pause resets practice.";
  return `${head} Next: ${upcoming}.${pause}`;
}

const diagnoseFrame = (
  matcher: Matcher,
  frame: TrackingFrame,
  templates: Templates,
) =>
  matcher === "image"
    ? diagnoseEmbedding(frame.embedding, templates)
    : diagnose(frame.hands, frame.aspect, templates);

const frameVector = (matcher: Matcher, frame: TrackingFrame) =>
  matcher === "image" ? frame.embedding : features(frame.hands, frame.aspect);

/** Whether the hands have moved away from `from`, the pose just accepted. */
function released(
  vector: number[] | null | undefined,
  from: number[] | null,
  distance: (a: number[], b: number[]) => number,
  limit: number,
) {
  return (
    !vector ||
    !from ||
    vector.length !== from.length ||
    distance(vector, from) > limit
  );
}

/** A calibration sample from the latest frame, or null when there is none. */
function captureVector(matcher: Matcher, frame: TrackingFrame) {
  if (matcher !== "image") return features(frame.hands, frame.aspect);
  return frame.embedding?.length ? compactEmbedding(frame.embedding) : null;
}

function capturedStatus(
  matcher: Matcher,
  id: string,
  count: number,
  frame: TrackingFrame,
  vector: number[],
) {
  const tracked =
    matcher === "image"
      ? `image crop: ${frame.crop ?? "center"}`
      : `tracked as ${vector.length === 42 ? "1 hand" : "2 hands"}`;
  return `Saved ${count} sample${count === 1 ? "" : "s"} for ${seals.find((s) => s.id === id)?.name} (${tracked}). Capture at least 3 with small pose variations.`;
}

/** A static seal with too few samples for the matcher yet. */
const needsTeaching = (seal: string | undefined, known: number) =>
  !!seal && staticSeals.has(seal) && known < TEACH_SAMPLES;

type Teaching = { seal: string; count: number; hold: number; waiting: boolean };
const sameTeaching = (a: Teaching | null, b: Teaching) =>
  a?.seal === b.seal &&
  a.count === b.count &&
  a.hold === b.hold &&
  a.waiting === b.waiting;

type Timer = ReturnType<typeof setTimeout> | undefined;
type SetStatus = (status: string) => void;

/**
 * Personal calibration samples for the active matcher: storage, the timed
 * capture countdown and clearing.
 */
function useCalibration(
  matcher: Matcher,
  setStatus: SetStatus,
  stable: RefObject<StableSeal>,
  tracking: RefObject<TrackingFrame>,
  frameAt: RefObject<number>,
) {
  const [templates, setTemplates] = useState<Templates>(() =>
    loadCalibration(matcher),
  );
  const templatesRef = useRef(templates);
  templatesRef.current = templates;
  const captureTimer = useRef<Timer>(undefined);
  const capturing = useRef(false);
  useEffect(() => () => clearInterval(captureTimer.current), []);

  const cancelCapture = useCallback(() => {
    clearInterval(captureTimer.current);
    capturing.current = false;
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
  const addSample = (id: string, sample: number[]) => {
    const next = {
      ...templatesRef.current,
      [id]: [...(templatesRef.current[id] ?? []), sample].slice(-12),
    };
    return { next, saved: saveTemplates(next) };
  };
  /** Ends the countdown by storing the latest frame, if it is fresh and usable. */
  const finishCapture = (id: string) => {
    cancelCapture();
    const frame = tracking.current;
    const fresh = performance.now() - frameAt.current < 500;
    const vector = fresh ? captureVector(matcher, frame) : null;
    if (!vector) {
      setStatus(
        matcher === "image" && fresh
          ? "The image matcher is still loading. Capture again in a moment."
          : "Could not see your hands. Keep the seal in frame and capture again.",
      );
      return;
    }
    const { next, saved } = addSample(id, vector);
    if (saved)
      setStatus(capturedStatus(matcher, id, next[id].length, frame, vector));
    stable.current = new StableSeal();
  };
  const calibrate = (id: string, tracked: boolean) => {
    if (capturing.current) return;
    if (!staticSeals.has(id)) {
      setStatus(
        "Movement gestures need a temporal model. Practice this step manually.",
      );
      return;
    }
    if (!tracked) {
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
      if (seconds) setStatus(`Capturing in ${seconds}… Hold your seal still.`);
      else finishCapture(id);
    }, 1000);
  };
  const clearCalibration = () => {
    cancelCapture();
    if (saveTemplates({}))
      setStatus("All personal calibration samples cleared.");
    stable.current = new StableSeal();
  };
  return {
    templates,
    templatesRef,
    capturing,
    cancelCapture,
    addSample,
    calibrate,
    clearCalibration,
  };
}

interface PracticeInput {
  steps: string[] | null | undefined;
  sequence: { name: string }[];
  techniqueName: string;
  mode: AppModel["mode"];
  /** True while teaching or calibrating, which do not count as a pause. */
  paused: () => boolean;
  /** Stops anything else that a reset must cancel, such as a capture. */
  onReset: () => void;
}

/** Progress through the selected sequence, its pause timeout and the effect. */
function usePractice(
  input: PracticeInput,
  setStatus: SetStatus,
  stable: RefObject<StableSeal>,
) {
  const latest = useRef(input);
  latest.current = input;
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [activeEffect, setActiveEffect] = useState(false);
  const effectTimer = useRef<Timer>(undefined);
  const sequenceTimer = useRef<Timer>(undefined);
  useEffect(
    () => () => {
      clearTimeout(effectTimer.current);
      clearTimeout(sequenceTimer.current);
    },
    [],
  );

  const setStep = useCallback((step: number) => {
    progressRef.current = step;
    setProgress(step);
  }, []);
  const previewEffect = useCallback(() => {
    clearTimeout(effectTimer.current);
    setActiveEffect(true);
    effectTimer.current = setTimeout(() => setActiveEffect(false), 6500);
  }, []);
  const resetSequence = useCallback(() => {
    clearTimeout(sequenceTimer.current);
    clearTimeout(effectTimer.current);
    latest.current.onReset();
    setStep(0);
    setActiveEffect(false);
    stable.current = new StableSeal();
    setStatus("Sequence reset. Begin with the first seal.");
  }, [setStep, setStatus, stable]);
  /** After 8 seconds without a step, camera practice starts over. */
  const startPauseTimer = () => {
    sequenceTimer.current = setTimeout(function expire() {
      // Teaching a seal or calibrating is not a pause in practice.
      if (latest.current.paused()) {
        sequenceTimer.current = setTimeout(expire, 8000);
        return;
      }
      setStep(0);
      stable.current = new StableSeal();
      setStatus("Sequence timed out after 8 seconds. Start again.");
    }, 8000);
  };
  const inputSeal = (id: string) => {
    const { steps, sequence, techniqueName, mode } = latest.current;
    if (!steps?.length) {
      setStatus(
        "This technique has no known practice sequence. Use effect preview.",
      );
      return;
    }
    clearTimeout(sequenceTimer.current);
    const previous =
      progressRef.current === steps.length ? 0 : progressRef.current;
    const next = advanceSequence(steps, previous, id);
    setStep(next.progress);
    if (next.complete) {
      previewEffect();
      setStatus(`${techniqueName}: sequence complete. Effect playing.`);
      return;
    }
    setStatus(stepStatus(next, id, sequence[next.progress].name, mode));
    if (next.progress && mode === "camera") startPauseTimer();
  };
  return {
    progress,
    progressRef,
    activeEffect,
    previewEffect,
    resetSequence,
    inputSeal,
  };
}

/** Refs and callbacks the frame pipeline shares with the rest of the app. */
interface RecognitionInput {
  matcher: Matcher;
  templatesRef: RefObject<Templates>;
  progressRef: RefObject<number>;
  practice: RefObject<{ steps: string[]; mode: AppModel["mode"] }>;
  capturing: RefObject<boolean>;
  calibrationOpen: RefObject<boolean>;
  /** Set each frame: whether hands-free teaching owns the camera. */
  teachingRef: RefObject<boolean>;
  stable: RefObject<StableSeal>;
  tracking: RefObject<TrackingFrame>;
  frameAt: RefObject<number>;
  recorder: RefObject<SessionRecorder | null>;
  arenaFocus: RefObject<string | null>;
  arenaListener: RefObject<((id: string) => void) | null>;
  inputSeal: (id: string) => void;
  addSample: (id: string, sample: number[]) => { next: Templates };
  setStatus: SetStatus;
}

/**
 * The per-frame pipeline: match the hands, check the pose, teach seals that
 * lack samples, and pass accepted seals on to practice or the arena.
 */
function useRecognition(input: RecognitionInput) {
  const latest = useRef(input);
  latest.current = input;
  const { matcher } = input;
  const [crop, setCrop] = useState<CropSource | undefined>();
  const [teaching, setTeaching] = useState<Teaching | null>(null);
  const [handsDetected, setHandsDetected] = useState(0);
  const [detectedSeal, setDetectedSeal] = useState<string | null>(null);
  const [match, setMatch] = useState<Diagnosis>({ reason: "no-hands" });
  const [poseCheck, setPoseCheck] = useState<PoseCheck | null>(null);
  // Frame-to-frame steadiness thresholds are starting guesses, not measured.
  const steady = useRef(
    matcher === "image"
      ? new SteadyCapture(0.06, cosineDistance)
      : new SteadyCapture(0.08, rms),
  );
  // The pose of the step just accepted. Teaching the next seal waits until the
  // hands move away from it, so a lingering seal is not saved as the next one.
  const releaseFrom = useRef<number[] | null>(null);
  const poseDistance = matcher === "image" ? cosineDistance : rms;
  const releaseLimit = matcher === "image" ? IMAGE_MATCH_LIMIT : MATCH_LIMIT;

  const teach = (id: string, sample: number[]) => {
    const { addSample, setStatus, stable, inputSeal } = latest.current;
    const stored = matcher === "image" ? compactEmbedding(sample) : sample;
    const { next } = addSample(id, stored);
    if (next[id].length < TEACH_SAMPLES) {
      setStatus(
        `Learning ${sealName(id)}: ${next[id].length} of ${TEACH_SAMPLES} samples. Keep holding.`,
      );
      return;
    }
    // The pose being held is the seal just taught: accept the step and keep
    // the matcher from firing it again until the hands release.
    stable.current.hold(id, performance.now());
    releaseFrom.current = sample;
    inputSeal(id);
  };
  /** Hands-free teaching: show hold progress and store a sample once steady. */
  const teachFrame = (
    seal: string,
    count: number,
    vector: number[] | null | undefined,
    now: number,
  ) => {
    const waiting = releaseFrom.current !== null;
    if (waiting) steady.current.reset();
    const { hold, sample } = waiting
      ? { hold: 0, sample: null }
      : steady.current.update(vector, now);
    const shown: Teaching = {
      seal,
      count,
      hold: Math.round(hold * 10) / 10,
      waiting,
    };
    setTeaching((previous) =>
      sameTeaching(previous, shown) ? previous : shown,
    );
    if (sample) teach(seal, sample);
  };
  const teachFrameRef = useRef(teachFrame);
  teachFrameRef.current = teachFrame;
  const onFrame = useCallback(
    (frame: TrackingFrame) => {
      const {
        templatesRef,
        progressRef,
        practice,
        capturing,
        calibrationOpen,
        teachingRef,
        stable,
        tracking,
        frameAt,
        recorder,
        arenaFocus,
        arenaListener,
        inputSeal,
      } = latest.current;
      tracking.current = frame;
      frameAt.current = performance.now();
      setHandsDetected(frame.hands.length);
      setCrop(frame.crop);
      const diagnosis = diagnoseFrame(matcher, frame, templatesRef.current);
      setMatch((previous) =>
        sameDiagnosis(previous, diagnosis) ? previous : diagnosis,
      );
      const label = diagnosis.reason === "match" ? diagnosis.best : null;
      setDetectedSeal(label && sealName(label));
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
      const focus = practiceFocus(mode, arenaFocus.current, next);
      const check = focus ? checkPose(focus, frame.hands, frame.aspect) : null;
      setPoseCheck((previous) =>
        samePoseCheck(previous, check) ? previous : check,
      );
      teachingRef.current =
        mode === "camera" &&
        needsTeaching(next, known) &&
        !capturing.current &&
        !calibrationOpen.current;
      const vector = frameVector(matcher, frame);
      if (released(vector, releaseFrom.current, poseDistance, releaseLimit))
        releaseFrom.current = null;
      if (teachingRef.current) {
        teachFrameRef.current(next, known, vector, now);
        return;
      }
      steady.current.reset();
      setTeaching(null);
      const accepted = stable.current.update(label, now);
      if (accepted && !capturing.current) {
        releaseFrom.current = vector ?? null;
        if (mode === "arena") arenaListener.current?.(accepted);
        else inputSeal(accepted);
      }
    },
    [matcher],
  );
  return {
    onFrame,
    crop,
    teaching,
    handsDetected,
    detectedSeal,
    match,
    poseCheck,
  };
}

/** The chosen technique and variant, with the seal sequence it implies. */
function useTechnique(setStatus: SetStatus) {
  const [selected, setSelected] = useState(initialTechnique);
  const [variantId, setVariantId] = useState(initialTechnique.variants[0].id);
  const variant = selected.variants.find((v) => v.id === variantId)!;
  const sequence = (variant.steps ?? []).map(
    (id) => seals.find((seal) => seal.id === id)!,
  );
  const selectTechnique = (id: string, reset: () => void) => {
    const next = techniques.find((t) => t.id === id);
    if (!next) return;
    reset();
    setSelected(next);
    setVariantId(next.variants[0].id);
    setStatus(
      next.variants[0].steps?.length
        ? "Technique selected. Tap the seals in order."
        : "Technique selected. Preview its effect below.",
    );
  };
  const selectVariant = (id: string, reset: () => void) => {
    if (!selected.variants.some((v) => v.id === id)) return;
    reset();
    setVariantId(id);
  };
  return {
    selected,
    variantId,
    variant,
    sequence,
    effect: effectFor(selected.id, selected.nature),
    selectTechnique,
    selectVariant,
  };
}

/** In the arena, recognized seals answer the drill instead of the sequence. */
function useArenaBridge() {
  const focus = useRef<string | null>(null);
  const listener = useRef<((id: string) => void) | null>(null);
  const setArenaFocus = useCallback((id: string | null) => {
    focus.current = id;
  }, []);
  const onArenaSeal = useCallback((next: (id: string) => void) => {
    listener.current = next;
    return () => {
      if (listener.current === next) listener.current = null;
    };
  }, []);
  return { focus, listener, setArenaFocus, onArenaSeal };
}

const previewStatus = (name: string) =>
  `${name} preview. This does not count as a recognized sequence.`;

/** Camera start/stop and input-mode switches; each also resets practice. */
function modeControls(
  camera: { startCamera(): Promise<void>; stopCamera(): void },
  mode: AppModel["mode"],
  setMode: (mode: AppModel["mode"]) => void,
  resetSequence: () => void,
  setStatus: SetStatus,
): Pick<AppModel, "startCamera" | "stopCamera" | "setMode"> {
  return {
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
      setStatus(modeStatus[next]);
    },
  };
}

/** Follows the system reduced-motion setting; the UI can also toggle it. */
function useReducedMotion() {
  const state = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const setReducedMotion = state[1];
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReducedMotion(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, [setReducedMotion]);
  return state;
}

/** The seal practice would check now: the arena's focus, or the next step. */
const practiceFocus = (
  mode: AppModel["mode"],
  arena: string | null,
  next: string | undefined,
) => (mode === "arena" ? arena : mode === "camera" ? next : null);

export default function App() {
  const [mode, setMode] = useState<AppModel["mode"]>("demo");
  const [mirrored, setMirrored] = useState(true);
  const [reducedMotion, setReducedMotion] = useReducedMotion();
  const [status, setStatus] = useState(modeStatus.demo);
  const technique = useTechnique(setStatus);
  const { selected, variant, sequence, effect } = technique;
  const arena = useArenaBridge();
  const [matcher] = useState(readMatcher);
  const teachingRef = useRef(false);
  const calibrationOpen = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tracking = useRef<TrackingFrame>({ hands: [], face: [], aspect: 1 });
  const frameAt = useRef(0);
  const stable = useRef(new StableSeal());
  const recorder = useRef<SessionRecorder | null>(null);
  const practice = useRef({ steps: [] as string[], mode });
  practice.current = { steps: variant.steps ?? [], mode };
  const calibration = useCalibration(
    matcher,
    setStatus,
    stable,
    tracking,
    frameAt,
  );
  const { templates, templatesRef, capturing } = calibration;
  const {
    progress,
    progressRef,
    activeEffect,
    previewEffect,
    resetSequence,
    inputSeal,
  } = usePractice(
    {
      steps: variant.steps,
      sequence,
      techniqueName: selected.name,
      mode,
      paused: () => teachingRef.current || calibrationOpen.current,
      onReset: calibration.cancelCapture,
    },
    setStatus,
    stable,
  );
  const {
    onFrame,
    crop,
    teaching,
    handsDetected,
    detectedSeal,
    match,
    poseCheck,
  } = useRecognition({
    matcher,
    templatesRef,
    progressRef,
    practice,
    capturing,
    calibrationOpen,
    teachingRef,
    stable,
    tracking,
    frameAt,
    recorder,
    arenaFocus: arena.focus,
    arenaListener: arena.listener,
    inputSeal,
    addSample: calibration.addSample,
    setStatus,
  });

  const camera = useCamera(
    videoRef,
    onFrame,
    activeEffect && faceEffects.has(effect.type),
    matcher === "image" || recordMode,
  );

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
    variantId: technique.variantId,
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
    ...modeControls(camera, mode, setMode, resetSequence, setStatus),
    poseCheck,
    setArenaFocus: arena.setArenaFocus,
    onArenaSeal: arena.onArenaSeal,
    selectTechnique: (id) => technique.selectTechnique(id, resetSequence),
    selectVariant: (id) => technique.selectVariant(id, resetSequence),
    inputSeal,
    resetSequence,
    previewEffect: () => {
      previewEffect();
      setStatus(previewStatus(effect.name));
    },
    calibrate: (id) =>
      calibration.calibrate(
        id,
        camera.cameraStatus === "live" && camera.trackerStatus === "ready",
      ),
    clearCalibration: calibration.clearCalibration,
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
