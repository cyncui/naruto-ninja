import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  ImageEmbedder,
} from "@mediapipe/tasks-vision";

let hands: HandLandmarker | undefined;
let face: FaceLandmarker | undefined;
let embedder: ImageEmbedder | undefined;

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const files = await FilesetResolver.forVisionTasks(
        new URL("vision", data.base).href,
        true,
      );
      // MediaPipe allows one task per worker ("ModuleFactory not set"), so the
      // face tracker and image embedder each get their own worker.
      if (data.task === "embed") {
        embedder = await ImageEmbedder.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: new URL("models/image_embedder.tflite", data.base)
              .href,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          l2Normalize: true,
        });
        self.postMessage({ type: "embed-ready" });
      } else if (data.task === "face") {
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
          // Clasped seals overlap and hide fingers; strict thresholds drop
          // one or both hands exactly when the pose matters.
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
        self.postMessage({ type: "ready" });
      }
    } catch (error) {
      console.error("Vision worker init failed", error);
      self.postMessage({ type: "error", message: String(error) });
    }
    return;
  }
  if (data.type === "frame") {
    const bitmap: ImageBitmap = data.bitmap;
    try {
      if (embedder) {
        self.postMessage({
          type: "embedding",
          embedding: embedder.embedForVideo(bitmap, data.timestamp, {
            regionOfInterest: data.region,
          }).embeddings[0]?.floatEmbedding,
          crop: data.crop,
        });
        return;
      }
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
