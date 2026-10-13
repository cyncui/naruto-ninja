# Preliminary application

## Runtime choices

Vite/React/TypeScript supplies the UI. The preliminary renderer uses Canvas 2D rather than Three.js: all initial effects are overlays and frame copies, so a 3D scene graph adds download and complexity without helping these particular effects. Three.js remains a later option for meshes or richer particles. The production UI does not load the MediaPipe worker or model files before camera activation.

`@mediapipe/tasks-vision` 1.1.0 is pinned. Its ES-module worker requires `FilesetResolver.forVisionTasks(path, true)`; the default classic loader fails with `ModuleFactory not set` in a module worker. The inference delegate is CPU/WASM; preprocessing still uses the task library's WebGL facilities. Hand and optional face tasks use separate workers because the task library’s one-shot module factory cannot initialize both tasks in one module worker. Each worker has at most one bitmap in flight; hands run at a maximum requested cadence of about 15 Hz, and inference/bitmap ownership stays in the worker. Frames are resized to 640 px wide. These are scheduling choices, not measured performance claims.

Camera permission can be canceled. A generation token closes streams arriving after cancellation. Stop/pagehide/unmount stop tracks and terminate both workers. Loading/denied/disconnected/tracker-error states remain explicit, with manual practice available. Camera animation runs at a requested maximum of about 33 fps (10 fps in reduced-motion mode); offscreen inference pauses while the document is hidden.

## Recognition

The catalogue's ordered symbolic IDs drive a selected-technique matcher. Wrong steps restart matching (retaining a matching first step); an 8-second gap resets partial progress in Camera mode. Manual Demo rehearsal is untimed. Empty/unresolved sequences never auto-cast. A held label emits once after 350 ms. Consecutive duplicate signs require a 180 ms release or a different stable sign.

Calibration captures after 3 seconds. Each sample contains 84 normalized image-coordinate features from two 21-point hands. Joint centering/scaling preserves relative hand positions; per-hand world coordinates are intentionally not combined as a shared 3D coordinate system. Each label needs 3 examples; at most 12 are retained. A nearest-example RMS threshold 0.16 and a between-label margin 0.035 reject distant/ambiguous observations. These are provisional thresholds with no population validation. Corrupt stored samples are rejected, and action gestures cannot be calibrated as static poses.

Use controlled recordings across people, camera angles, lighting, occlusion and negative poses before promoting this to general recognition. The classifier should eventually be replaced without changing the UI or sequence contract.

## Effect scope

The 2D renderer includes an original pixel-art training scene, hand-landmark outlines and eight visual categories. Viewport aura and clone-frame echoes need no additional model. Face Landmarker loads only for eye/marking requests. Sharingan uses a red tint; Byakugan uses a pale tint. These are illustrative app effects, not a claim that one generic sign has an exclusive canonical power. A preview cannot satisfy the practice sequence.

## Sources and model assets

- [Hand Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [Face Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [Official worker example](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/workers/hand-landmarker.worker.ts)

Setup serves pinned-version package WASM files locally. Google model version 1 assets:

| Model | Bytes | SHA-256 |
|---|---:|---|
| Hand Landmarker | 7,819,105 | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| Face Landmarker | 3,758,596 | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |

Large generated vision assets are ignored by Git and recreated by `npm run prepare:vision`. Preserve upstream package/model licensing when redistributing. The application includes no downloaded franchise artwork.
