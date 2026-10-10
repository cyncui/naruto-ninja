import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from "@mediapipe/tasks-vision";

let hands: HandLandmarker | undefined;
let face: FaceLandmarker | undefined;

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const files = await FilesetResolver.forVisionTasks(
        new URL("vision", data.base).href,
        true,
      );
      if (data.task === "face") {
        face = await FaceLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: new URL("models/face_landmarker.task", data.base)
              .href,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        self.postMessage({ type: "face-ready" });
      } else {
        hands = await HandLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: new URL("models/hand_landmarker.task", data.base)
              .href,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        self.postMessage({ type: "ready" });
      }
    } catch (error) {
      self.postMessage({ type: "error", message: String(error) });
    }
    return;
  }
  if (data.type === "frame") {
    const bitmap: ImageBitmap = data.bitmap;
    try {
      self.postMessage({
        type: "result",
        hands: hands?.detectForVideo(bitmap, data.timestamp).landmarks ?? [],
        face:
          face?.detectForVideo(bitmap, data.timestamp).faceLandmarks[0] ?? [],
      });
    } catch (error) {
      self.postMessage({ type: "frame-error", message: String(error) });
    } finally {
      bitmap.close();
    }
  }
};
