import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { AppModel } from "./app-model";
import Icon from "./Icon";
import { closeOnEscape } from "./dialog";

function calibrationStatus(model: AppModel, ready: boolean) {
  if (ready) return model.status;
  if (model.cameraStatus === "requesting" || model.cameraStatus === "error")
    return model.cameraMessage;
  return model.cameraStatus === "live"
    ? model.trackerMessage
    : "Start the camera and wait for the hand tracker before capturing.";
}

/** Personal setup: teach seals by timed capture, and display preferences. */
export default function CalibrationDialog({
  model,
  dialog,
  ready,
  seal,
  onSeal,
}: {
  model: AppModel;
  dialog: RefObject<HTMLDialogElement | null>;
  ready: boolean;
  /** The seal chosen for capture. */
  seal: string;
  onSeal: (id: string) => void;
}) {
  const calibrationStarting = useRef(false);
  useEffect(() => {
    if (ready && calibrationStarting.current) {
      calibrationStarting.current = false;
      if (dialog.current?.open) dialog.current.querySelector("select")?.focus();
    }
  }, [ready, dialog]);
  const totalSamples = Object.values(model.samples).reduce((a, b) => a + b, 0);
  return (
    <dialog
      onKeyDown={closeOnEscape}
      className="lab-dialog calibration-dialog"
      ref={dialog}
      onClose={() => model.setCalibrationOpen(false)}
      aria-labelledby="calibration-title"
    >
      <header className="dialog-header">
        <span>
          <b lang="ja">個人調整</b> PERSONAL SETUP
        </span>
        <i className="hazard" aria-hidden="true" />
        <button
          aria-label="Close calibration and settings"
          onClick={() => dialog.current?.close()}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="dialog-content">
        <h2 id="calibration-title">Teach your hands.</h2>
        <p className="calibration-intro">
          Recognition is personal and experimental. Hand tracking alone does not
          know Naruto signs.
        </p>
        <div className="calibration-instruction">
          <strong>3 seconds to get ready. 3 samples per pose.</strong>
          <p>
            Choose a seal, press capture, then make the seal in view. Hold it
            until the countdown finishes. Clasped hands often track as one hand,
            and hidden fingers are estimated. That is fine: hold the seal the
            same way when you practise and it will match.
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
          <select value={seal} onChange={(e) => onSeal(e.target.value)}>
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
              dialog.current?.close();
              model.calibrate(seal);
            }}
          >
            Capture in 3 seconds <Icon name="arrow" />
          </button>
          <span>{totalSamples} examples saved</span>
        </div>
        <p className="calibration-status" role="status">
          {calibrationStatus(model, ready)}
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
          never photos. Eye and marking previews need a visible face. Close this
          window to return to the camera.
        </p>
      </div>
    </dialog>
  );
}
