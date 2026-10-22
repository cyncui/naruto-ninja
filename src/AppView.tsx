import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AppModel, Seal } from "./app-model";
import Icon from "./Icon";
import Scramble from "./Scramble";
import SevenSegment from "./SevenSegment";
import TrainingSeal from "./TrainingSeal";
import Arena from "./Arena";
import SequencePanel from "./SequencePanel";
import TechniqueCatalogue from "./TechniqueCatalogue";
import CalibrationDialog from "./CalibrationDialog";
import { useTween } from "./useTween";
import { glyphFor } from "./seals";
import { MATCH_LIMIT } from "./runtime/recognition";
import { IMAGE_MATCH_LIMIT } from "./runtime/embedding";
import { TEACH_SAMPLES } from "./runtime/teach";
import type { Diagnosis } from "./runtime/recognition";
import "./view.css";

const pad = (n: number) => String(n).padStart(2, "0");
const poseIssues = {
  "no-hands": ["warn", "NO HANDS IN FRAME"],
  "too-small": ["warn", "HANDS TOO SMALL · MOVE CLOSER"],
  uncalibrated: ["alert", "NO SEALS CALIBRATED"],
} as const;
function describeMatch(
  match: Diagnosis,
  name: (id: string) => string,
  limit: number,
) {
  if (match.reason === "hand-count")
    return [
      "warn",
      `TRACKING ${match.hands} HAND${match.hands === 1 ? "" : "S"} · NO SAMPLES LIKE THIS · RECALIBRATE`,
    ];
  if (!("best" in match)) return poseIssues[match.reason];
  const best = name(match.best).toUpperCase();
  const distance = match.distance.toFixed(2);
  if (match.reason === "no-match")
    return ["warn", `NO MATCH · NEAREST ${best} ${distance} > ${limit}`];
  if (match.reason === "ambiguous")
    return [
      "warn",
      `UNSURE · ${best} OR ${name(match.runnerUp!).toUpperCase()}`,
    ];
  return ["ok", `MATCH · ${best} ${distance}`];
}

const modes = [
  ["demo", "Demo"],
  ["camera", "Camera"],
  ["arena", "Arena"],
] as const;
function ModeSwitch({
  className,
  model,
}: {
  className: string;
  model: AppModel;
}) {
  return (
    <div className={className} role="group" aria-label="Input mode">
      {modes.map(([mode, label]) => (
        <button
          key={mode}
          aria-pressed={model.mode === mode}
          onClick={() => model.setMode(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const cameraLabels: Record<AppModel["cameraStatus"], string> = {
  live: "End camera",
  requesting: "Cancel request",
  idle: "Start camera",
  error: "Start camera",
};

/** Feed state in the masthead, in English and Japanese. */
function feedState(model: AppModel): [string, string] {
  const live = model.cameraStatus === "live";
  if (model.mode === "demo") return ["DEMO / SIMULATION", "模擬"];
  if (model.mode === "arena")
    return [live ? "ARENA / CAMERA" : "ARENA / PRACTICE", "演習"];
  const label = `CAMERA / ${
    {
      live: "LIVE",
      requesting: "REQUESTING",
      error: "ERROR",
      idle: "STANDBY",
    }[model.cameraStatus]
  }`;
  return [
    label,
    live ? "稼働" : model.cameraStatus === "error" ? "警告" : "待機",
  ];
}

const deviceBusy = (model: AppModel) =>
  model.cameraStatus === "error" ||
  model.trackerStatus === "error" ||
  model.cameraStatus === "requesting" ||
  model.trackerStatus === "loading";

function teachingText(model: AppModel, ready: boolean, seal: Seal) {
  if (!ready) return "Start the camera to teach this seal hands-free.";
  const elsewhere = model.teaching && model.teaching.seal !== seal.id;
  return model.teaching?.waiting || elsewhere
    ? `Now switch to the ${seal.name} seal.`
    : "Make the seal and hold still. Samples are captured automatically, then practice carries on.";
}

const calibrated = (model: AppModel, id: string) =>
  (model.samples[id] ?? 0) >= TEACH_SAMPLES;

function Masthead({ model }: { model: AppModel }) {
  const [feedLabel, feedJp] = feedState(model);
  return (
    <header className="masthead">
      <div className="brand">
        <span className="brand-seal" aria-hidden="true">
          忍
        </span>
        <div>
          <strong>
            NARUTO<span>/</span>NINJA
          </strong>
          <small>HAND SEAL LABORATORY · EXPERIMENTAL</small>
        </div>
      </div>
      <span className="hazard masthead-hazard" aria-hidden="true" />
      <div className="feed-state">
        <i
          className={
            model.cameraStatus === "live" && model.mode === "camera"
              ? "pilot on"
              : "pilot"
          }
        />
        <span className="jp" aria-hidden="true">
          {feedJp}
        </span>
        {feedLabel}
      </div>
      <div className="edition">
        <b>PILOT : YOU</b>
        <span>DATA ANALYZED ON THIS DEVICE</span>
      </div>
      <ModeSwitch className="mobile-mode" model={model} />
    </header>
  );
}

function Telemetry({
  model,
  currentSeal,
  completed,
}: {
  model: AppModel;
  currentSeal: Seal | undefined;
  completed: boolean;
}) {
  const ratio = model.sequence.length
    ? Math.min(model.progress, model.sequence.length) / model.sequence.length
    : 0;
  const shownRatio = useTween(ratio, model.reducedMotion);
  const syncValue = model.sequence.length
    ? (shownRatio * 100).toFixed(1).padStart(5, "0")
    : "---.-";
  const meters = [
    { id: "00", label: "SEALS", value: ratio },
    {
      id: "01",
      label: "HANDS",
      value: model.mode === "camera" ? model.handsDetected / 2 : 0,
    },
    { id: "02", label: "CHAKRA", value: model.activeEffect ? 1 : 0 },
  ];
  return (
    <div className="practice-intro">
      <p className="hero-kanji" lang="ja">
        印契同調試験
      </p>
      <p className="hero-statement">
        Hand seal <span>synchronization test</span>
      </p>
      <div className="telemetry" aria-hidden="true">
        <div className="sync-readout">
          <span className="sync-label">
            <b lang="ja">同調率</b>SYNC RATIO
          </span>
          <SevenSegment
            key={model.progress}
            value={syncValue}
            label="Sync ratio"
          />
          <span className="sync-unit">%</span>
        </div>
        <p className="sync-lines">
          <span>
            SEALS : {pad(Math.min(model.progress, model.sequence.length))} /{" "}
            {pad(model.sequence.length)}
          </span>
          <span>
            NEXT :{" "}
            {currentSeal ? (
              <>
                <b lang="ja">{glyphFor(currentSeal.id)}</b>{" "}
                {currentSeal.name.toUpperCase()}
              </>
            ) : completed ? (
              <>
                <b lang="ja">完了</b> COMPLETE
              </>
            ) : (
              "NONE"
            )}
          </span>
        </p>
        <div className="meters">
          <div className="meter-scale">
            <span>+0</span>
            <span>+50.0</span>
            <span>+100.0</span>
            <span className="meter-caution">( CAUTION )</span>
          </div>
          {meters.map((meter) => (
            <div className="meter" key={meter.id}>
              <span className="meter-label">
                <small>SUBJECT</small>
                <b>{meter.id}</b>
                <small>{meter.label}</small>
              </span>
              <span className="meter-bar">
                {Array.from({ length: 32 }, (_, i) => (
                  <i
                    key={i}
                    className={i < Math.round(meter.value * 32) ? "on" : ""}
                    style={{ "--i": i } as CSSProperties}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
      <span className="practice-instruction">
        Tap the seals in order. Try Camera after calibration.
      </span>
    </div>
  );
}

function Colophon() {
  return (
    <div className="room-colophon">
      <a href="/guide">
        <span className="jp" aria-hidden="true">
          手引
        </span>
        <Scramble text="Field guide" /> <Icon name="arrow" />
      </a>
      <span className="internal-plate">
        <b lang="ja">内部</b>
        <span>
          INTERNAL
          <br />
          LOCAL PROCESSING
        </span>
      </span>
      <span className="privacy-note">
        <i aria-hidden="true" /> Camera frames stay on your device.
      </span>
    </div>
  );
}

function CameraReadout({ model, ready }: { model: AppModel; ready: boolean }) {
  const [feedLabel] = feedState(model);
  const cameraPractice = model.mode === "camera";
  const sequenceSeals = [...new Set(model.sequence.map((seal) => seal.id))];
  const calibratedCount = sequenceSeals.filter((id) =>
    calibrated(model, id),
  ).length;
  const [matchTone, matchText] = describeMatch(
    model.match,
    (id) => model.seals.find((seal) => seal.id === id)?.name ?? id,
    model.matcher === "image" ? IMAGE_MATCH_LIMIT : MATCH_LIMIT,
  );
  return (
    <div className="camera-readout">
      <span className="mobile-feed">{feedLabel}</span>
      <span className="tag-tracker">
        {model.mode === "demo"
          ? "MANUAL REHEARSAL"
          : `TRACKER: ${model.trackerStatus.toUpperCase()}`}
      </span>
      {cameraPractice && model.sequence.length > 0 && (
        <span
          className={
            calibratedCount === sequenceSeals.length ? "tag-ok" : "tag-alert"
          }
        >
          CALIBRATED {calibratedCount}/{sequenceSeals.length} SEALS
        </span>
      )}
      {cameraPractice && ready && model.matcher === "image" && (
        <span className="tag-warn">
          IMAGE MATCHER · CROP {(model.crop ?? "center").toUpperCase()}
        </span>
      )}
      {cameraPractice && ready && (
        <span className={`tag-${matchTone}`}>
          {model.handsDetected}/2 HANDS · {matchText}
        </span>
      )}
      {model.faceStatus === "loading" && <span>Loading face effects…</span>}
      {model.faceStatus === "error" && (
        <span>Face effects unavailable. Restart camera to retry.</span>
      )}
      <span className={model.activeEffect ? "" : "tag-standby"}>
        {model.activeEffect ? "VISUAL SIMULATION ACTIVE" : "EFFECT STANDBY"}
      </span>
    </div>
  );
}

function TeachingAlert({
  model,
  ready,
  currentSeal,
}: {
  model: AppModel;
  ready: boolean;
  currentSeal: Seal;
}) {
  const taught =
    model.teaching?.seal === currentSeal.id
      ? model.teaching
      : { count: model.samples[currentSeal.id] ?? 0, hold: 0 };
  return (
    <div className="calibration-alert teaching-panel" role="status">
      <span className="hazard" aria-hidden="true" />
      <p>
        <b>
          <span lang="ja">教習</span> Teaching {currentSeal.name}
        </b>
        {teachingText(model, ready, currentSeal)}
      </p>
      <div className="teach-meter" aria-hidden="true">
        <span className="teach-count">
          {taught.count}/{TEACH_SAMPLES}
        </span>
        <span className="teach-pips">
          {Array.from({ length: TEACH_SAMPLES }, (_, i) => (
            <i key={i} className={i < taught.count ? "on" : ""} />
          ))}
        </span>
        <span className="teach-hold">
          <i style={{ width: `${taught.hold * 100}%` }} />
        </span>
      </div>
    </div>
  );
}

function DeviceMessage({ model }: { model: AppModel }) {
  const failed =
    model.cameraStatus === "error" || model.trackerStatus === "error";
  return (
    <div className="device-message" role={failed ? "alert" : "status"}>
      <b className="message-tag" aria-hidden="true">
        {failed ? "警告 WARNING" : "待機 STANDBY"}
      </b>
      {model.cameraMessage && <p>{model.cameraMessage}</p>}
      {model.trackerMessage && <p>{model.trackerMessage}</p>}
    </div>
  );
}

function ControlDock({
  model,
  openCatalogue,
  openCalibration,
}: {
  model: AppModel;
  openCatalogue: () => void;
  openCalibration: () => void;
}) {
  return (
    <nav className="control-dock" aria-label="Camera and practice controls">
      <ModeSwitch className="mode-switch" model={model} />
      <button
        className="camera-button"
        onClick={
          model.cameraStatus === "live" || model.cameraStatus === "requesting"
            ? model.stopCamera
            : model.startCamera
        }
      >
        <Icon name={model.cameraStatus === "live" ? "stop" : "record"} />{" "}
        {cameraLabels[model.cameraStatus]}
      </button>
      <span className="dock-divider" />
      <button className="catalogue-button" onClick={() => openCatalogue()}>
        <Icon name="library" /> Techniques
      </button>
      <button className="preview-button" onClick={model.previewEffect}>
        Preview<span className="desktop-label"> effect</span>{" "}
        <Icon name="arrow" />
      </button>
      <button
        className="settings-button"
        aria-label="Calibration"
        onClick={openCalibration}
      >
        <span className="desktop-label">Calibration</span>
        <Icon name="calibrate" className="settings-icon" />
      </button>
    </nav>
  );
}

export default function AppView({ model }: { model: AppModel }) {
  const catalogue = useRef<HTMLDialogElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const [calibrationSeal, setCalibrationSeal] = useState(model.seals[0].id);
  const currentSeal = model.sequence[model.progress];
  const ready =
    model.cameraStatus === "live" && model.trackerStatus === "ready";
  const completed =
    model.sequence.length > 0 && model.progress >= model.sequence.length;
  const nextNeedsCalibration =
    model.mode === "camera" &&
    !!currentSeal &&
    !calibrated(model, currentSeal.id);
  const deviceMessage = deviceBusy(model);
  const openCalibration = () => {
    if (currentSeal) setCalibrationSeal(currentSeal.id);
    model.setCalibrationOpen(true);
    settings.current?.showModal();
  };
  const openCatalogue = () => catalogue.current?.showModal();
  return (
    <main
      id="main"
      tabIndex={-1}
      className={`ninja-screen ${model.cameraStatus === "live" ? "camera-live" : ""} ${nextNeedsCalibration && !deviceMessage ? "needs-calibration" : ""} ${model.mode === "arena" ? "arena-mode" : ""}`}
      data-reduced-motion={model.reducedMotion}
    >
      <div
        className="full-camera"
        aria-label="Camera and visual effect viewfinder"
      >
        {model.stage}
      </div>
      {model.mode === "arena" ? (
        <Arena model={model} />
      ) : (
        <TrainingSeal model={model} />
      )}
      <div className="ruler ruler-y" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>+{String(12 - i).padStart(2, "0")}</span>
        ))}
      </div>
      <div className="ruler ruler-x" aria-hidden="true">
        {Array.from({ length: 13 }, (_, i) => (
          <span key={i}>{i ? `+${(i - 1) * 10}` : "-10"}</span>
        ))}
      </div>
      <Masthead model={model} />
      <Telemetry
        model={model}
        currentSeal={currentSeal}
        completed={completed}
      />
      <Colophon />
      <CameraReadout model={model} ready={ready} />
      {nextNeedsCalibration && !deviceMessage && (
        <TeachingAlert model={model} ready={ready} currentSeal={currentSeal} />
      )}
      {deviceMessage && <DeviceMessage model={model} />}
      <SequencePanel
        model={model}
        currentSeal={currentSeal}
        completed={completed}
        openCatalogue={openCatalogue}
      />
      <ControlDock
        model={model}
        openCatalogue={openCatalogue}
        openCalibration={openCalibration}
      />
      <TechniqueCatalogue model={model} dialog={catalogue} />
      <CalibrationDialog
        model={model}
        dialog={settings}
        ready={ready}
        seal={calibrationSeal}
        onSeal={setCalibrationSeal}
      />
    </main>
  );
}
