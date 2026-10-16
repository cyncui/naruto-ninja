# Image matcher spike

An experimental alternative to the landmark matcher for clasped seals. It is off by default.

## Why

The landmark matcher compares MediaPipe hand landmarks with your calibration samples. Interlocked seals break that input: the hands often track as one merged hand or not at all, and hidden fingers are estimated, not seen. The image matcher compares what the camera sees around your hands instead.

## How to try it

1. Open the app with `?matcher=image`. The choice is remembered in this browser. Open `?matcher=landmarks` to switch back.
2. Start the camera. The readout shows `IMAGE MATCHER · CROP HANDS | RECENT | CENTER`.
3. Practise in Camera mode. Untaught seals are taught hands-free: practice pauses on the seal, and three samples are captured each time you hold it steady (`src/runtime/teach.ts`). The Calibration dialog also works. Each matcher keeps its own samples, so you need to teach again after switching.
4. Practise in Camera mode. The readout shows the nearest seal and its distance, or why the pose was rejected.

## How it works

- **Crop** (`src/runtime/crop.ts`). The crop is a square, padded box around every tracked hand. When tracking drops, the last box is reused for one second, then the matcher falls back to the centre of the frame (`CropMemory`). The crop is computed on the main thread from the latest hand result, so it lags the image by about one tracker frame.
- **Embedding** (`src/runtime/vision.worker.ts`, `task: "embed"`). MediaPipe `ImageEmbedder` runs MobileNet v3 small (float32) with `l2Normalize` on the crop through `regionOfInterest`. No pixels are copied or stored. MediaPipe allows one task per worker ("ModuleFactory not set" otherwise), so the embedder runs in its own worker, like the face tracker. Frames are sent at most every 120 ms.
- **Matching** (`src/runtime/embedding.ts`). Each frame is compared with every seal that has at least 3 samples, using cosine distance (1 − similarity). The matcher rejects the frame if the nearest seal is further than `IMAGE_MATCH_LIMIT`, or if the runner-up is within `IMAGE_MATCH_MARGIN`. It returns the same `Diagnosis` as the landmark matcher, so the camera-mode readout, warnings and sequence logic are unchanged.
- **Storage.** Samples live under `naruto-ninja.image-calibration.v1`, rounded to 4 decimals. That is about 7 KB per sample, so a full 12 × 12 calibration is about 1 MB of localStorage. Only embeddings are saved, never frames.

## Cost

| Item            | Value                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model           | `mobilenet_v3_small.tflite`, 4,117,670 bytes, checksum pinned in `scripts/prepare-vision.mjs`                                                                     |
| Embedding size  | 1024 floats                                                                                                                                                       |
| Downloaded      | Only when `?matcher=image` is on and the camera starts                                                                                                            |
| First embedding | About 0.5 s after camera start in one local run: Playwright fake camera, warm dev server, models already cached. Not a representative cold-load or device figure. |

Per-frame inference time and battery cost have not been measured.

## Limits

- **Thresholds are guesses.** `IMAGE_MATCH_LIMIT = 0.2` and `IMAGE_MATCH_MARGIN = 0.02` have not been tuned on real seals. In the fake-camera run, one calibrated seal matched an animated test pattern at distances from 0.01 to 0.42, so a single threshold can easily let unrelated frames through.
- **It sees the background.** The crop includes your face, clothes and room. With few seals calibrated, a frame that isn't a seal can still be nearest to one. There is no "no seal" class yet.
- **The centre fallback assumes a centred seal.** When tracking is lost and there was no recent box, the matcher embeds the middle of the frame.
- **No accuracy figures.** Recognition quality between seals has not been measured. This is a personal nearest-example prototype, not a trained Naruto-sign model.

## Next steps

1. Add a "rest" class captured with hands down or relaxed, so frames that aren't seals have something closer to match.
2. Record a small personal set of seals and tune the limit and margin from measured distances.
3. Compare per seal with the landmark matcher. Consider using the image matcher only when landmark tracking reports one hand or none.
4. If nearest-example stays unreliable, train a small classifier head on the embeddings from the user's own samples.
