# Browser vision and effects stack research

Researched October 9, 2026. This is an architecture recommendation based on current primary documentation and source inspection, not a measured prototype. Naruto canon and technique definitions are covered separately.

## Recommendation

Build a static, client-side app with **Vite + TypeScript + React for UI, MediaPipe Hand Landmarker in a Web Worker, a small custom two-hand classifier, an explicit sequence state machine, and Three.js for camera overlays and effects**. Start the classifier with interpretable geometry/templates for the feasibility experiment; use a trained small MLP with ONNX Runtime Web WASM when the dataset justifies it. Load Face Landmarker for eye/face effects and segmentation only for effects that actually need them. The difficult engineering problem is reliable recognition of interlocked fingers, followed by convincing visual effects—not the choice of React framework.

Vite provides a static production build and React/TypeScript templates. A server-rendered application or application backend is unnecessary for the initial camera loop. React should own controls and tutorial state; tracking and rendering should update outside React state each frame. This separation is a design recommendation, not a Vite performance guarantee. [Vite guide](https://vite.dev/guide/)

| Layer | Proposed choice | Reason |
|---|---|---|
| Camera | Native `getUserMedia`, front camera, video element | Avoid an unnecessary camera wrapper; request camera only |
| Frame scheduling | `requestVideoFrameCallback`, one inference in flight | Process fresh camera frames; discard backlog |
| Tracking | `@mediapipe/tasks-vision`, Hand Landmarker, `VIDEO`, `numHands: 2` | Two hands, landmark geometry and handedness |
| Recognition | Custom joint hand features → small classifier → temporal stabilizer | Naruto seals require custom labels and relationships between both hands |
| Sequence matching | TypeScript state machine/trie | Explicit order, ambiguity, timing and repeat rules |
| Visual effects | Three.js WebGL2, shaders, particles, textures | Eye patterns, lightning, fire, aura, clone compositing |
| Optional trackers | Face Landmarker; person segmentation; pose only when needed | Avoid paying for every model on every frame |
| Distribution | Static HTTPS hosting, cache pinned model/runtime assets | No inference server required |

## What MediaPipe does—and what it does not

Hand Landmarker returns 21 points per detected hand, image coordinates, per-hand world coordinates, and handedness. Set `numHands: 2` explicitly: the default is one. Video mode reuses tracking and only reruns palm detection after tracking/presence failure. The browser `detectForVideo` call is synchronous; Google explicitly recommends a worker to keep it off the UI thread. Its world-coordinate origin is each hand's geometric center, so simply subtracting the two hands' world positions does **not** yield their true physical separation. [Web Hand Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js)

The canned Gesture Recognizer knows seven common gestures plus `None`—not Naruto seals. Its output is a list of results for individual hands. A custom single-hand label does not automatically solve a joint two-hand pose or a sequence. Use Hand Landmarker as the geometry source and own the classification layer. [Web Gesture Recognizer guide](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer/web_js)

The current Google customization guide marks MediaPipe Model Maker as **deprecated and no longer actively maintained**. The documented workflow extracts landmarks, requires a `none` class, and drops images where no hand is detected. That makes its easy-training path particularly misleading for heavily occluded examples: excluded failures cannot appear in the classifier's accuracy score. Prefer a small maintained training pipeline with explicit failure accounting. [Gesture customization guide](https://developers.google.com/edge/mediapipe/solutions/customization/gesture_recognizer)

## The first technical risk: intertwined hands

The hand model card linked from the current task documentation lists occluded hands as outside its intended scope and reports larger errors for blurry/occluded joints. This is not proof that Naruto seals are impossible; it is evidence that a polished single-hand demo is insufficient proof. The card is from 2021, so its caveats should be tested against the exact current model version, not assumed to be current benchmark results. [Google hand tracking model card, pages 3 and 6](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20(Lite_Full)%20with%20Fairness%20Oct%202021.pdf)

Proposed first experiment: capture all 12 base seals and special gestures with several real people, on an iPhone, a middle-range Android phone and a laptop. Measure two-hand detection coverage, tracking losses, hand-slot flips, seal confusions and end-to-end cast success. Include motion into and out of a seal. If relevant details are consistently invisible or landmarks collapse, add a small image classifier operating on a crop containing **both hands** and fuse its scores with geometry; do not spend weeks tuning angles that the tracker cannot see. This escalation is a proposed design, not a validated model.

Feature design should preserve per-hand finger shape **and** the relationship between hands: joint angles, normalized distances, orientation, screen-space wrist offset, inter-hand proximity, visibility/presence flags, and motion. Normalize screen-space distances with aspect-ratio-aware coordinates. Maintain a single mirror convention for raw inference, handedness and displayed overlays. Do not independently center every hand and then expect the classifier to know whether those hands touch. Do not treat monocular hand `z` as an accurate shared depth sensor.

## Recognition and training plan

Recommended pipeline:

```text
Camera → latest frame → vision worker → two-hand features → seal probabilities
       → unknown/rejection gate → stable seal events → sequence state machine
       → cast event → effect renderer (+ face/person tracking when required)
```

Use a small MLP as the first trained baseline; a temporal model is a later option if a state machine cannot handle real motion. A frame classifier plus a stabilizer is easier to inspect than a sequence network. Stabilization should include a confidence threshold, margin between the top two classes, short persistence, release/transition handling, cooldown and explicit `unknown` output. A lost hand should not automatically count as the previous seal. Prefix collisions between techniques need a selected technique, a timeout, or an explicit completion signal.

Training requirements are a project proposal: capture clips from different people, lighting, skin tones, camera positions and speeds; label neutral hands, partial seals, transitions and lookalikes; retain failed tracker frames as failures. Split by **person and recording session**, not random adjacent frames. Test both isolated seals and full uninterrupted sequences. Measure false activations per minute, per-class precision/recall, total cast success, tracking coverage and latency. A random split of near-identical frames is not evidence that the model works for a new user. There is no defensible universal sample-count promise before the pilot confusion matrix exists.

## Browser and GPU details

`getUserMedia` requires permission and a secure context (HTTPS or localhost). Use ideal rather than mandatory camera constraints, request no microphone, handle denied/missing cameras, and stop tracks when the session ends. A 720p capture is a proposed starting point; increase only when hands are too small or lower when device cost warrants it. [MDN camera API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

`requestVideoFrameCallback` is designed for work associated with presented video frames. Use it to avoid classifying the same camera frame repeatedly; rendering can run independently. One in-flight inference plus latest-frame replacement prevents stale input accumulating while a slow phone struggles. [MDN video frame callback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)

Google's current worker sample passes an `ImageBitmap` to `detectForVideo`, then closes it after inference. Use that as the starting pattern and benchmark bitmap transfer/copy overhead on devices. MediaPipe's public task options expose CPU/GPU delegates; its vision task canvas interface explicitly initializes a **WebGL** context. Do not describe MediaPipe's GPU switch as a WebGPU backend. Try GPU and CPU/WASM paths on the chosen browsers, keeping a tested fallback. [Google worker implementation](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/workers/hand-landmarker.worker.ts), [task options](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/core/task_runner_options.d.ts), [vision canvas contract](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/core/vision_task_options.d.ts)

Three.js's WebGL renderer requires WebGL2; WebGL1 support was removed in r163. Feature-detect that requirement. WebGL2 is the proposed first renderer because these effects do not inherently need compute shaders. WebGPU can be an enhancement after compatibility and performance tests. [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)

WebGPU is **not categorically absent on Safari**: WebKit states Safari 26.0 shipped it in September 2025. Some ONNX documentation still shows an older compatibility matrix. Browser API availability is not proof that a particular runtime build and model work; feature-detect, initialize the actual model, and retain WASM. [WebKit Safari 26.2 release notes](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/), [ONNX Runtime Web matrix](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)

ONNX recommends WASM for very lightweight models when binary size matters. Its WASM provider supports all ONNX operators, while GPU providers support subsets. Use a WASM-only import for the small classifier, lazy-load it, and measure the **runtime plus model** download, not just classifier weights. WASM multithreading additionally requires browser support and cross-origin isolation; start with one thread for a tiny MLP. [ONNX WebGPU guidance](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html), [provider tradeoffs](https://onnxruntime.ai/docs/tutorials/web/), [deployment bundles](https://onnxruntime.ai/docs/tutorials/web/deploy.html), [threading flags](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)

TensorFlow.js is a valid alternative when the team already has a TensorFlow model/training pipeline; it offers WebGL, WASM and WebGPU packages. It is unnecessary alongside both MediaPipe and ONNX in the first implementation. Backend choice needs device benchmarks, and its GPU tensors require disposal. For an extremely small MLP, exporting weights and evaluating dense layers in TypeScript is another candidate that removes a runtime dependency, but it requires parity testing and profiling; it is not automatically the best choice. [TensorFlow.js packages](https://tensorflow.github.io/tfjs/), [runtime and memory guidance](https://www.tensorflow.org/js/guide/platform_environment)

## Transformations without excessive model cost

Use authored AR effects for the live experience: iris overlays, facial markings, particle fire/lightning, screen-space chakra effects, and person cutout compositing for clones. This can visibly transform the user while keeping the response immediate. Full generative restyling of every camera frame is a separate product requirement with a different inference and consistency budget; no researched source establishes that it meets this project's lightweight/mobile goals.

Face Landmarker supplies a 478-point mesh, blendshapes and optional transformation matrices appropriate for facial effects. Load it for face-dependent modes; one-face smoothing is available. Pose tracking supplies body landmarks and may be useful for body-attached effects, but simple face/hand modes do not require it. [Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker), [Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker)

Person segmentation enables a clone cutout or aura behind the body. Hair/multiclass segmentation is available but brings extra cost. Google's published Pixel 6 task averages list roughly 33–35 ms for basic selfie segmentation and 71 ms GPU / 218 ms CPU for multiclass segmentation; these are **not browser measurements or additive guarantees for this application**. Start with basic person segmentation only when an effect needs it, at a lower cadence, with quality degradation on weaker devices. [Segmentation model options and published benchmarks](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)

## Existing implementations: evidence and limits

**Sealwork** uses MediaPipe, a 126→256→128→13 MLP, ONNX Runtime Web, an unknown class and plateau-based commitment. Its README reports approximately 66K parameters / 260 KB weights, but explicitly says the current model is single-subject and has no verified accuracy on strangers. Source inspection confirms the MLP definition and optional leave-one-person-out path. This is useful architecture evidence, not proof of general recognition quality or mobile performance. Its advertised tiny model excludes the landmarker and runtime downloads. [Project README](https://github.com/yogendrarau/sealwork), [training source](https://github.com/yogendrarau/sealwork/blob/main/train.py)

**Jutsu Master** is a native iOS implementation of a related pipeline. Its README reports 6,146 source images, 3,961 usable landmark samples, and 2,177 images with no detected hands; only 672 usable samples contained two detected hands. These are author-reported counts, not independently reproduced measurements. The numbers do not fully reconcile to the source count (eight images are unaccounted for in the summary), and tracker rejection must be counted separately from reported classifier accuracy. Its approximately 97.5% held-out classifier result should not be repeated as whole-system reliability. [Author's implementation and reported results](https://github.com/Farrellhrs/naruto-jutsu-recognition)

## Proposed acceptance targets and next step

These are targets to test, not results: responsive preview at 30 fps on the selected mobile baseline; higher render rate on capable devices; 15–30 hand inferences per second; roughly 150–250 ms from a settled recognizable final seal to the first visible effect, including stability time. Keep the frame queue bounded and record p50/p95 stage timings rather than reporting average FPS alone. Test a sustained 10-minute session for thermal degradation and memory growth.

The first deliverable should be a camera feasibility spike with all seal reference poses, tracking overlays, unknown-state feedback and recorded failure statistics. Ship a small set of dependable techniques and effects before expanding the catalogue. Pin the exact runtime/model versions after those real-device results. No app, model training, dataset download, or performance benchmark was run as part of this research.
