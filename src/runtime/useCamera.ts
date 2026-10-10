import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Point } from "./recognition";

export interface TrackingFrame {
  hands: Point[][];
  face: Point[];
  aspect: number;
}
export function useCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
  onFrame: (frame: TrackingFrame) => void,
  withFace: boolean,
) {
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "requesting" | "live" | "error"
  >("idle");
  const [cameraMessage, setCameraMessage] = useState(
    "Your camera stays on this device.",
  );
  const [trackerStatus, setTrackerStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [trackerMessage, setTrackerMessage] = useState("Camera off");
  const [faceStatus, setFaceStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const faceWorker = useRef<Worker | null>(null);
  const faceTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const session = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const worker = useRef<Worker | null>(null);
  const callback = useRef(onFrame);
  callback.current = onFrame;
  const faceEnabled = useRef(withFace);
  faceEnabled.current = withFace;
  const requested = useRef(false);
  const raf = useRef(0);
  const initTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const stopCamera = useCallback(() => {
    session.current++;
    requested.current = false;
    cancelAnimationFrame(raf.current);
    clearTimeout(initTimeout.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    worker.current?.terminate();
    worker.current = null;
    faceWorker.current?.terminate();
    faceWorker.current = null;
    clearTimeout(faceTimeout.current);
    setFaceStatus("idle");
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
    setCameraMessage("Camera stopped. Your video was not saved.");
    setTrackerStatus("idle");
    setTrackerMessage("Camera off");
    callback.current({ hands: [], face: [], aspect: 1 });
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
      const tracker = new Worker(
        new URL("./vision.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = tracker;
      let busy = false;
      let ready = false;
      let lastTime = -1;
      let sentAt = 0;
      let faceRequested = false;
      let faceReady = false;
      let faceBusy = false;
      let lastFaceAt = 0;
      let lastFace: Point[] = [];
      const base = new URL(import.meta.env.BASE_URL, location.href).href;
      const failTracker = () => {
        if (token !== session.current) return;
        ready = false;
        tracker.terminate();
        if (worker.current === tracker) worker.current = null;
        clearTimeout(initTimeout.current);
        setTrackerStatus("error");
        setTrackerMessage(
          "Tracking unavailable. You can still use camera effects and manual seals. Restart the camera to retry.",
        );
        callback.current({ hands: [], face: [], aspect: 1 });
      };
      tracker.onerror = failTracker;
      tracker.onmessage = ({ data }) => {
        if (token !== session.current) return;
        if (data.type === "ready") {
          clearTimeout(initTimeout.current);
          ready = true;
          setTrackerStatus("ready");
          setTrackerMessage("Hand tracking ready · teach your own seals below");
        } else if (data.type === "result") {
          busy = false;
          callback.current({
            hands: data.hands,
            face: faceEnabled.current ? lastFace : [],
            aspect: video.videoWidth / video.videoHeight,
          });
        } else if (data.type === "error" || data.type === "frame-error")
          failTracker();
      };
      tracker.postMessage({ type: "init", base });
      initTimeout.current = setTimeout(failTracker, 45000);
      const tick = async (now: number) => {
        if (token !== session.current) return;
        raf.current = requestAnimationFrame(tick);
        if (
          !ready ||
          busy ||
          document.hidden ||
          video.readyState < 2 ||
          lastTime === video.currentTime ||
          now - sentAt < 65
        )
          return;
        if (faceEnabled.current && !faceRequested) {
          faceRequested = true;
          setFaceStatus("loading");
          // Separate workers avoid reusing the task library's one-shot module factory.
          const faceTracker = new Worker(
            new URL("./vision.worker.ts", import.meta.url),
            { type: "module" },
          );
          faceWorker.current = faceTracker;
          const failFace = () => {
            if (token !== session.current) return;
            faceReady = false;
            lastFace = [];
            faceTracker.terminate();
            if (faceWorker.current === faceTracker) faceWorker.current = null;
            clearTimeout(faceTimeout.current);
            setFaceStatus("error");
          };
          faceTracker.onerror = failFace;
          faceTracker.onmessage = ({ data }) => {
            if (token !== session.current) return;
            if (data.type === "face-ready") {
              clearTimeout(faceTimeout.current);
              faceReady = true;
              setFaceStatus("ready");
            } else if (data.type === "result") {
              faceBusy = false;
              lastFace = data.face;
            } else if (data.type === "error" || data.type === "frame-error")
              failFace();
          };
          faceTracker.postMessage({ type: "init", task: "face", base });
          faceTimeout.current = setTimeout(failFace, 45000);
        }
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
          if (token !== session.current || !ready) {
            bitmap.close();
            return;
          }
          if (
            faceEnabled.current &&
            faceReady &&
            !faceBusy &&
            now - lastFaceAt > 100
          ) {
            faceBusy = true;
            lastFaceAt = now;
            let copy: ImageBitmap | undefined;
            try {
              copy = await createImageBitmap(bitmap);
              if (token !== session.current) {
                copy.close();
                bitmap.close();
                return;
              }
              if (faceReady && faceWorker.current) {
                faceWorker.current.postMessage(
                  { type: "frame", bitmap: copy, timestamp: now },
                  [copy],
                );
              } else {
                copy.close();
                faceBusy = false;
              }
            } catch {
              copy?.close();
              faceBusy = false;
            }
          }
          if (token !== session.current || !ready) {
            bitmap.close();
            return;
          }
          tracker.postMessage(
            {
              type: "frame",
              bitmap,
              timestamp: now,
            },
            [bitmap],
          );
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
      setCameraMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow it in your browser, then try again. Demo mode is always available."
          : error instanceof DOMException && error.name === "NotFoundError"
            ? "No camera found. Connect one, or use demo mode."
            : error instanceof Error
              ? `Could not start the camera: ${error.message}`
              : "Could not start the camera. Try demo mode.",
      );
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
