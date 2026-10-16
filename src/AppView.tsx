import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AppModel } from "./app-model";
import FloatingPanel from "./FloatingPanel";
import SevenSegment from "./SevenSegment";
import TrainingSeal from "./TrainingSeal";
import { glyphFor } from "./seals";
import "./view.css";

const shortName = (name: string) =>
  name
    .replace(/^(Fire|Water|Wind|Earth|Lightning|Wood|Ice) Release: /, "")
    .replace(/ Technique$/, "")
    .replace(/[—–]/g, "-");
const pad = (n: number) => String(n).padStart(2, "0");

export default function AppView({ model }: { model: AppModel }) {
  const sequenceRail = useRef<HTMLOListElement>(null);
  useEffect(() => {
    sequenceRail.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [model.progress, model.selected.id, model.variantId]);
  const catalogue = useRef<HTMLDialogElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const calibrationStarting = useRef(false);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [calibrationSeal, setCalibrationSeal] = useState(model.seals[0].id);
  const variant = model.selected.variants.find(
    (v) => v.id === model.variantId,
  )!;
  const choices = model.techniques.filter(
    (t) =>
      (family === "all" || t.family === family) &&
      `${t.name} ${t.family} ${t.nature.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const families = [...new Set(model.techniques.map((t) => t.family))].sort();
  const totalSamples = Object.values(model.samples).reduce((a, b) => a + b, 0);
  const currentSeal = model.sequence[model.progress];
  const ready =
    model.cameraStatus === "live" && model.trackerStatus === "ready";
  useEffect(() => {
    if (ready && calibrationStarting.current) {
      calibrationStarting.current = false;
      if (settings.current?.open)
        settings.current.querySelector("select")?.focus();
    }
  }, [ready]);
  const completed =
    model.sequence.length > 0 && model.progress >= model.sequence.length;
  const cameraLabel =
    model.cameraStatus === "live"
      ? "End camera"
      : model.cameraStatus === "requesting"
        ? "Cancel request"
        : "Start camera";
  const feedLabel =
    model.mode === "demo"
      ? "DEMO / SIMULATION"
      : model.cameraStatus === "live"
        ? "CAMERA / LIVE"
        : model.cameraStatus === "requesting"
          ? "CAMERA / REQUESTING"
          : model.cameraStatus === "error"
            ? "CAMERA / ERROR"
            : "CAMERA / STANDBY";
  const ratio = model.sequence.length
    ? Math.min(model.progress, model.sequence.length) / model.sequence.length
    : 0;
  const syncValue = model.sequence.length
    ? (ratio * 100).toFixed(1).padStart(5, "0")
    : "---.-";
  const feedJp =
    model.mode === "demo"
      ? "模擬"
      : model.cameraStatus === "live"
        ? "稼働"
        : model.cameraStatus === "error"
          ? "警告"
          : "待機";
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
    <main
      id="main"
      tabIndex={-1}
      className={`ninja-screen ${model.cameraStatus === "live" ? "camera-live" : ""}`}
      data-reduced-motion={model.reducedMotion}
    >
      <div
        className="full-camera"
        aria-label="Camera and visual effect viewfinder"
      >
        {model.stage}
      </div>
      <TrainingSeal model={model} />
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
        <div className="mobile-mode" role="group" aria-label="Input mode">
          <button
            aria-pressed={model.mode === "demo"}
            onClick={() => model.setMode("demo")}
          >
            Demo
          </button>
          <button
            aria-pressed={model.mode === "camera"}
            onClick={() => model.setMode("camera")}
          >
            Camera
          </button>
        </div>
      </header>
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
            <SevenSegment value={syncValue} label="Sync ratio" />
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
      <div className="room-colophon">
        <a href="/guide">
          <span className="jp" aria-hidden="true">
            手引
          </span>
          Field guide <span aria-hidden="true">↗</span>
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
      <div className="camera-readout">
        <span className="mobile-feed">{feedLabel}</span>
        <span>
          {model.mode === "demo"
            ? "MANUAL REHEARSAL"
            : `TRACKER: ${model.trackerStatus.toUpperCase()}`}
        </span>
        {model.mode === "camera" && (
          <span>
            {model.handsDetected}/2 HANDS
            {model.detectedSeal ? ` · ${model.detectedSeal}` : ""}
          </span>
        )}
        {model.faceStatus === "loading" && <span>Loading face effects…</span>}
        {model.faceStatus === "error" && (
          <span>Face effects unavailable. Restart camera to retry.</span>
        )}
        <span>
          {model.activeEffect ? "VISUAL SIMULATION ACTIVE" : "EFFECT STANDBY"}
        </span>
      </div>
      {(model.cameraStatus === "error" ||
        model.trackerStatus === "error" ||
        model.cameraStatus === "requesting" ||
        model.trackerStatus === "loading") && (
        <div
          className="device-message"
          role={
            model.cameraStatus === "error" || model.trackerStatus === "error"
              ? "alert"
              : "status"
          }
        >
          <b className="message-tag" aria-hidden="true">
            {model.cameraStatus === "error" || model.trackerStatus === "error"
              ? "警告 WARNING"
              : "待機 STANDBY"}
          </b>
          {model.cameraMessage && <p>{model.cameraMessage}</p>}
          {model.trackerMessage && <p>{model.trackerMessage}</p>}
        </div>
      )}
      <FloatingPanel
        title="HAND SEQUENCE"
        jp="印契配列"
        footer={
          currentSeal?.sourceUrl ? (
            <>
              <a
                href={currentSeal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Seal reference ↗
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
              onClick={() => catalogue.current?.showModal()}
              aria-label="Change technique"
              title="Change technique"
            >
              ↗
            </button>
          </div>
          {model.sequence.length ? (
            <ol ref={sequenceRail} className="sequence-rail">
              {model.sequence.map((seal, index) => (
                <li key={`${index}-${seal.id}`}>
                  <button
                    onClick={() => model.inputSeal(seal.id)}
                    className={`seal-step ${index < model.progress ? "complete" : ""} ${index === model.progress ? "current" : ""}`}
                    aria-current={index === model.progress ? "step" : undefined}
                    aria-label={`Practice step ${index + 1}: ${String(index + 1).padStart(2, "0")} ${glyphFor(seal.id)} ${seal.name}`}
                  >
                    <span aria-hidden="true">
                      {index < model.progress
                        ? "✓"
                        : String(index + 1).padStart(2, "0")}
                    </span>
                    <b className="seal-glyph" aria-hidden="true">
                      {glyphFor(seal.id)}
                    </b>
                    <strong>{seal.name}</strong>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="no-sequence">
              <strong>
                {variant.kind === "no_seals"
                  ? "No hand seals reported."
                  : "The hand-sign sequence is unresolved."}
              </strong>
              <p>Effect preview is available below.</p>
            </div>
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
                    · Scroll signs ↔
                  </span>
                )}
              </span>
            </div>
            <button onClick={model.resetSequence}>↺ Reset</button>
          </div>
          <p className="runtime-status" role="status">
            {model.status}
          </p>
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
                <span aria-hidden="true">+</span>
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
                {variant.evidence === "primary_verified"
                  ? "Primary source verified."
                  : variant.evidence === "unresolved"
                    ? "Activation unresolved. No sequence verified."
                    : "Secondary-reported sequence. Not primary-verified."}{" "}
                {variant.sourceUrl && (
                  <a
                    href={variant.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View reference ↗
                  </a>
                )}
              </p>
              {variant.notes.map((note, i) => (
                <p key={i}>{note.replace(/[—–]/g, ", ")}</p>
              ))}
              <p>
                Click numbered signs to rehearse. Repeated signs are separate
                steps. Effect preview is a simulation, independent of completing
                practice.
              </p>
              <p>
                Zodiac characters are seal labels, not hand-position diagrams.
              </p>
            </div>
          </details>
          <details className="free-practice">
            <summary>Free seal practice</summary>
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
      <nav className="control-dock" aria-label="Camera and practice controls">
        <div className="mode-switch" role="group" aria-label="Input mode">
          <button
            aria-pressed={model.mode === "demo"}
            onClick={() => model.setMode("demo")}
          >
            Demo
          </button>
          <button
            aria-pressed={model.mode === "camera"}
            onClick={() => model.setMode("camera")}
          >
            Camera
          </button>
        </div>
        <button
          className="camera-button"
          onClick={
            model.cameraStatus === "live" || model.cameraStatus === "requesting"
              ? model.stopCamera
              : model.startCamera
          }
        >
          <span aria-hidden="true">
            {model.cameraStatus === "live" ? "■" : "●"}
          </span>{" "}
          {cameraLabel}
        </button>
        <span className="dock-divider" />
        <button
          className="catalogue-button"
          onClick={() => catalogue.current?.showModal()}
        >
          <span aria-hidden="true">▤</span> Techniques
        </button>
        <button className="preview-button" onClick={model.previewEffect}>
          Preview<span className="desktop-label"> effect</span>{" "}
          <span aria-hidden="true">↗</span>
        </button>
        <button
          className="settings-button"
          aria-label="Calibration"
          onClick={() => settings.current?.showModal()}
        >
          <span className="desktop-label">Calibration</span>
          <span className="settings-icon" aria-hidden="true">
            ☷
          </span>
        </button>
      </nav>
      <dialog
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.close();
          }
        }}
        className="lab-dialog"
        ref={catalogue}
        aria-labelledby="catalogue-title"
      >
        <header className="dialog-header">
          <span>
            <b lang="ja">術式目録</b> REFERENCE LIBRARY
          </span>
          <i className="hazard" aria-hidden="true" />
          <button
            aria-label="Close technique catalogue"
            onClick={() => catalogue.current?.close()}
          >
            ×
          </button>
        </header>
        <div className="dialog-content">
          <h2 id="catalogue-title">
            Technique index<span>{model.techniques.length} entries</span>
          </h2>
          <div className="library-filters">
            <label className="search-label">
              <span>Search techniques, clans, or nature</span>
              <input
                type="search"
                placeholder="e.g. Fire, Uchiha, Shadow…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              <span>Collection</span>
              <select
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <option value="all">All collections</option>
                {families.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="results-count" aria-live="polite">
            {choices.length} matching{" "}
            {choices.length === 1 ? "entry" : "entries"}
          </p>
          <div className="technique-list">
            {choices.map((t) => (
              <button
                className={`technique-item ${t.id === model.selected.id ? "selected" : ""}`}
                key={t.id}
                onClick={() => {
                  model.selectTechnique(t.id);
                  catalogue.current?.close();
                }}
                aria-pressed={t.id === model.selected.id}
              >
                <span>
                  <strong>{t.name.replace(/[—–]/g, "-")}</strong>
                  <small>
                    {t.family}
                    {t.nature.length ? ` / ${t.nature.join(" + ")}` : ""}
                  </small>
                </span>
                <span aria-hidden="true">
                  {t.id === model.selected.id ? "●" : "↗"}
                </span>
              </button>
            ))}
            {!choices.length && (
              <p>No matching techniques. Try a different search.</p>
            )}
          </div>
        </div>
      </dialog>
      <dialog
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.close();
          }
        }}
        className="lab-dialog calibration-dialog"
        ref={settings}
        aria-labelledby="calibration-title"
      >
        <header className="dialog-header">
          <span>
            <b lang="ja">個人調整</b> PERSONAL SETUP
          </span>
          <i className="hazard" aria-hidden="true" />
          <button
            aria-label="Close calibration and settings"
            onClick={() => settings.current?.close()}
          >
            ×
          </button>
        </header>
        <div className="dialog-content">
          <h2 id="calibration-title">Teach your hands.</h2>
          <p className="calibration-intro">
            Recognition is personal and experimental. Hand tracking alone does
            not know Naruto signs.
          </p>
          <div className="calibration-instruction">
            <strong>3 seconds to get ready. 3 samples per pose.</strong>
            <p>
              Choose a seal, press capture, then put both hands back in view.
              Hold the pose until the countdown finishes. Both hands must be
              tracked at capture.
            </p>
          </div>
          {model.cameraStatus !== "live" && (
            <div className="calibration-camera-start">
              <button
                className="preview-button"
                disabled={model.cameraStatus === "requesting"}
                onClick={() => {
                  calibrationStarting.current = true;
                  model.startCamera();
                }}
              >
                {model.cameraStatus === "requesting"
                  ? "Starting camera…"
                  : "Start camera for calibration"}
              </button>
            </div>
          )}
          <label className="calibration-choice">
            <span>Seal to teach</span>
            <select
              value={calibrationSeal}
              onChange={(e) => setCalibrationSeal(e.target.value)}
            >
              {model.seals.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {model.samples[s.id] || 0} saved
                </option>
              ))}
            </select>
          </label>
          <div className="capture-row">
            <button
              className="preview-button"
              disabled={!ready}
              onClick={() => {
                settings.current?.close();
                model.calibrate(calibrationSeal);
              }}
            >
              Capture in 3 seconds ↗
            </button>
            <span>{totalSamples} examples saved</span>
          </div>
          <p className="calibration-status" role="status">
            {ready
              ? model.status
              : model.cameraStatus === "requesting" ||
                  model.cameraStatus === "error"
                ? model.cameraMessage
                : model.cameraStatus === "live"
                  ? model.trackerMessage
                  : "Start the camera and wait for the hand tracker before capturing."}
          </p>
          <button
            className="clear-samples"
            onClick={model.clearCalibration}
            disabled={!totalSamples}
          >
            Clear saved examples
          </button>
          <div className="preferences">
            <label>
              <input
                type="checkbox"
                checked={model.mirrored}
                onChange={model.toggleMirror}
              />{" "}
              Mirror camera feed
            </label>
            <label>
              <input
                type="checkbox"
                checked={model.reducedMotion}
                onChange={model.toggleReducedMotion}
              />{" "}
              Reduce effect motion
            </label>
          </div>
          <p className="calibration-foot">
            Video stays on your device. Calibration saves landmark vectors here,
            never photos. Eye and marking previews need a visible face. Close
            this window to return to the camera.
          </p>
        </div>
      </dialog>
    </main>
  );
}
