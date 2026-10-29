import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Point } from "./recognition";
import { FrameErrors } from "./frame-errors";
import { CropMemory } from "./crop";
import type { CropSource } from "./crop";

export interface Handedness {
  label: string;
  score: number;
}
export interface TrackingFrame {
  hands: Point[][];
  /** One entry per hand, in the same order as `hands`. */
  handedness?: Handedness[];
  face: Point[];
  aspect: number;
  /** Image embedding of the hand crop, when the image matcher is enabled. */
  embedding?: number[];
  crop?: CropSource;
}
type Status = "idle" | "loading" | "ready" | "error";
type Timer = ReturnType<typeof setTimeout> | undefined;
const blankFrame = (): TrackingFrame => ({ hands: [], face: [], aspect: 1 });

// Separate workers avoid reusing the task library's one-shot module factory.
const visionWorker = () =>
  new Worker(new URL("./vision.worker.ts", import.meta.url), {
    type: "module",
  });

function cameraError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError")
    return "Camera permission was denied. Allow it in your browser, then try again. Demo mode is always available.";
  if (error instanceof DOMException && error.name === "NotFoundError")
    return "No camera found. Connect one, or use demo mode.";
  return error instanceof Error
    ? `Could not start the camera: ${error.message}`
    : "Could not start the camera. Try demo mode.";
}

/**
 * Posts a copy of `bitmap` to a side worker. Returns false, with the copy
 * released, when it could not be sent so the caller can clear its busy flag.
 */
async function sendCopy(
  bitmap: ImageBitmap,
  send: (copy: ImageBitmap) => boolean,
) {
  let copy: ImageBitmap | undefined;
  try {
    copy = await createImageBitmap(bitmap);
    if (send(copy)) return true;
    copy.close();
  } catch {
    copy?.close();
  }
  return false;
}

export function useCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
  onFrame: (frame: TrackingFrame) => void,
  withFace: boolean,
  withEmbedding = false,
) {
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "requesting" | "live" | "error"
  >("idle");
  const [cameraMessage, setCameraMessage] = useState(
    "Your camera stays on this device.",
  );
  const [trackerStatus, setTrackerStatus] = useState<Status>("idle");
  const [trackerMessage, setTrackerMessage] = useState("Camera off");
  const [faceStatus, setFaceStatus] = useState<Status>("idle");
  const workers = useRef<Record<"hands" | "face" | "embed", Worker | null>>({
    hands: null,
    face: null,
    embed: null,
  });
  const timers = useRef<{ init: Timer; face: Timer }>({
    init: undefined,
    face: undefined,
  });
  const session = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  // The latest props, read from worker callbacks that outlive a render.
  const latest = useRef({ onFrame, withFace, withEmbedding });
  latest.current = { onFrame, withFace, withEmbedding };
  const requested = useRef(false);
  const raf = useRef(0);

  const stopCamera = useCallback(() => {
    session.current++;
    requested.current = false;
    cancelAnimationFrame(raf.current);
    clearTimeout(timers.current.init);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    for (const worker of Object.values(workers.current)) worker?.terminate();
    workers.current = { hands: null, face: null, embed: null };
    clearTimeout(timers.current.face);
    setFaceStatus("idle");
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
    setCameraMessage("Camera stopped. Your video was not saved.");
    setTrackerStatus("idle");
    setTrackerMessage("Camera off");
    latest.current.onFrame(blankFrame());
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    if (requested.current) return;
    requested.current = true;
    const token = ++session.current;
    setCameraStatus("requesting");
    setCameraMessage("Waiting for camera permission…");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "A camera needs HTTPS or localhost in a supported browser.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (token !== session.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const video = videoRef.current!;
      video.srcObject = media;
      await video.play();
      if (token !== session.current) return;
      media.getVideoTracks()[0].onended = () => {
        stopCamera();
        setCameraStatus("error");
        setCameraMessage(
          "The camera disconnected. Reconnect it and try again.",
        );
      };
      setCameraStatus("live");
      setCameraMessage("Live · video processed on your device");
      setTrackerStatus("loading");
      setTrackerMessage("Loading hand tracking…");
      const tracker = visionWorker();
      workers.current.hands = tracker;
      let busy = false;
      let ready = false;
      let lastTime = -1;
      let sentAt = 0;
      let faceRequested = false;
      let faceReady = false;
      let faceBusy = false;
      let lastFaceAt = 0;
      let lastFace: Point[] = [];
      let lastHands: Point[][] = [];
      let embedReady = false;
      let embedBusy = false;
      let lastEmbedAt = 0;
      let lastEmbedding: { embedding?: number[]; crop?: CropSource } = {};
      const cropMemory = new CropMemory();
      const errors = {
        hands: new FrameErrors(),
        face: new FrameErrors(),
        embed: new FrameErrors(),
      };
      const base = new URL(import.meta.env.BASE_URL, location.href).href;
      const failTracker = (reason?: string) => {
        if (token !== session.current) return;
        ready = false;
        tracker.terminate();
        if (workers.current.hands === tracker) workers.current.hands = null;
        clearTimeout(timers.current.init);
        setTrackerStatus("error");
        setTrackerMessage(
          `Tracking unavailable${reason ? ` (${reason})` : ""}. You can still use camera effects and manual seals. Restart the camera to retry.`,
        );
        latest.current.onFrame(blankFrame());
      };
      tracker.onerror = () => failTracker();
      tracker.onmessage = ({ data }) => {
        if (token !== session.current) return;
        if (data.type === "ready") {
          clearTimeout(timers.current.init);
          ready = true;
          setTrackerStatus("ready");
          setTrackerMessage("Hand tracking ready · teach your own seals below");
        } else if (data.type === "result") {
          busy = false;
          errors.hands.ok();
          lastHands = data.hands;
          latest.current.onFrame({
            hands: data.hands,
            handedness: data.handedness,
            face: latest.current.withFace ? lastFace : [],
            aspect: video.videoWidth / video.videoHeight,
            ...lastEmbedding,
          });
        } else if (data.type === "frame-error") {
          busy = false;
          if (errors.hands.failed("Hand tracking", data.message))
            failTracker(data.message);
        } else if (data.type === "error") failTracker(data.message);
      };
      tracker.postMessage({ type: "init", base });
      timers.current.init = setTimeout(() => failTracker("timed out"), 45000);
      if (latest.current.withEmbedding) {
        const embedder = visionWorker();
        workers.current.embed = embedder;
        // The image matcher is optional: if it fails, landmark tracking and
        // manual practice carry on and frames simply have no embedding.
        const failEmbed = () => {
          embedReady = false;
          lastEmbedding = {};
          embedder.terminate();
          if (workers.current.embed === embedder) workers.current.embed = null;
        };
        embedder.onerror = failEmbed;
        embedder.onmessage = ({ data }) => {
          if (token !== session.current) return;
          if (data.type === "embed-ready") embedReady = true;
          else if (data.type === "embedding") {
            embedBusy = false;
            errors.embed.ok();
            lastEmbedding = { embedding: data.embedding, crop: data.crop };
          } else if (data.type === "frame-error") {
            embedBusy = false;
            if (errors.embed.failed("Image embedding", data.message))
              failEmbed();
          } else if (data.type === "error") failEmbed();
        };
        embedder.postMessage({ type: "init", task: "embed", base });
      }
      const startFace = () => {
        faceRequested = true;
        setFaceStatus("loading");
        const faceTracker = visionWorker();
        workers.current.face = faceTracker;
        const failFace = () => {
          if (token !== session.current) return;
          faceReady = false;
          lastFace = [];
          faceTracker.terminate();
          if (workers.current.face === faceTracker) workers.current.face = null;
          clearTimeout(timers.current.face);
          setFaceStatus("error");
        };
        faceTracker.onerror = failFace;
        faceTracker.onmessage = ({ data }) => {
          if (token !== session.current) return;
          if (data.type === "face-ready") {
            clearTimeout(timers.current.face);
            faceReady = true;
            setFaceStatus("ready");
          } else if (data.type === "result") {
            faceBusy = false;
            errors.face.ok();
            lastFace = data.face;
          } else if (data.type === "frame-error") {
            faceBusy = false;
            if (errors.face.failed("Face tracking", data.message)) failFace();
          } else if (data.type === "error") failFace();
        };
        faceTracker.postMessage({ type: "init", task: "face", base });
        timers.current.face = setTimeout(failFace, 45000);
      };
      const sendFace = async (bitmap: ImageBitmap, now: number) => {
        faceBusy = true;
        lastFaceAt = now;
        const sent = await sendCopy(bitmap, (copy) => {
          const face = workers.current.face;
          if (token !== session.current || !faceReady || !face) return false;
          face.postMessage({ type: "frame", bitmap: copy, timestamp: now }, [
            copy,
          ]);
          return true;
        });
        if (!sent) faceBusy = false;
      };
      const sendEmbed = async (bitmap: ImageBitmap, now: number) => {
        embedBusy = true;
        lastEmbedAt = now;
        const crop = cropMemory.next(
          lastHands,
          bitmap.width / bitmap.height,
          now,
        );
        const sent = await sendCopy(bitmap, (copy) => {
          const embed = workers.current.embed;
          if (token !== session.current || !embed) return false;
          embed.postMessage(
            {
              type: "frame",
              bitmap: copy,
              timestamp: now,
              region: crop.region,
              crop: crop.source,
            },
            [copy],
          );
          return true;
        });
        if (!sent) embedBusy = false;
      };
      /** Whether this animation frame has a new video frame worth tracking. */
      const due = (now: number) =>
        ready &&
        !busy &&
        !document.hidden &&
        video.readyState >= 2 &&
        lastTime !== video.currentTime &&
        now - sentAt >= 65;
      const tick = async (now: number) => {
        if (token !== session.current) return;
        raf.current = requestAnimationFrame(tick);
        if (!due(now)) return;
        if (latest.current.withFace && !faceRequested) startFace();
        lastTime = video.currentTime;
        sentAt = now;
        busy = true;
        try {
          const bitmap = await createImageBitmap(video, {
            resizeWidth: 640,
            resizeHeight: Math.round(
              (640 * video.videoHeight) / video.videoWidth,
            ),
          });
          const faceDue =
            latest.current.withFace &&
            faceReady &&
            !faceBusy &&
            now - lastFaceAt > 100;
          if (token !== session.current || !ready) {
            bitmap.close();
            return;
          }
          if (faceDue) await sendFace(bitmap, now);
          if (embedReady && !embedBusy && now - lastEmbedAt > 120)
            await sendEmbed(bitmap, now);
          if (token !== session.current || !ready) {
            bitmap.close();
            return;
          }
          tracker.postMessage({ type: "frame", bitmap, timestamp: now }, [
            bitmap,
          ]);
        } catch {
          busy = false;
          failTracker();
        }
      };
      raf.current = requestAnimationFrame(tick);
    } catch (error) {
      if (token !== session.current) return;
      stopCamera();
      setCameraStatus("error");
      setCameraMessage(cameraError(error));
    }
  }, [stopCamera, videoRef]);

  useEffect(() => {
    window.addEventListener("pagehide", stopCamera);
    return () => {
      window.removeEventListener("pagehide", stopCamera);
      stopCamera();
    };
  }, [stopCamera]);
  return {
    cameraStatus,
    cameraMessage,
    trackerStatus,
    trackerMessage,
    faceStatus,
    startCamera,
    stopCamera,
  };
}
