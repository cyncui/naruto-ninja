# Naruto Ninja

A preliminary camera playground for Naruto hand seals: a full-viewport feed, movable/resizable sequence window, a source-linked technique archive, local pose calibration and illustrative effects. Built with React, TypeScript, Vite, MediaPipe and Canvas 2D.

## Run

Use Node 24 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Start in Demo to practice without permission. Choose Camera and start it to enable local hand tracking. HTTPS is required when hosting beyond localhost. No account, API key or backend is needed.

```sh
npm run build
npm run test:e2e
```

For the browser tests, first run `npx playwright install chromium`. Build checks the research schema, TypeScript and sequence/classifier tests. The camera startup test uses Chromium’s synthetic camera with actual MediaPipe workers and model files; calibration workflow tests use controlled landmark fixtures. Permission denial is simulated at the browser media boundary; real-human recognition accuracy is not established by these tests.

## What works

- All 81 researched techniques and 95 activation variants, including unresolved and seal-free states.
- Ordered manual practice, repeated seals, reset, selected-technique disambiguation and timeout.
- Real camera permission/start/stop, two-hand landmarks in a worker, local personal calibration with a three-second capture timer.
- A full-viewport camera and movable/resizable, keyboard-operable sequence window; layout persists locally.
- Fire, lightning, water/chakra aura, clone echoes and face-anchored eye/marking previews. Models load only when needed.

## What is preliminary

The catalogue is symbolic research, not a trained Naruto classifier. All exact sequences are secondary-reported; none have been checked against original scenes. Calibration is a conservative nearest-example prototype requiring at least three samples per pose, made with both hands visible. Interlocked fingers, motion gestures and one-handed signs are not solved. There are no validated accuracy or device-performance claims.

The original pixel practice figure is illustrative, not a hand-pose reference. Camera effects are original approximations. Aura/fire/water/lightning are viewport-relative; clone echoes duplicate the frame, including its background, without person segmentation. Eyes/markings use optional face landmarks and disappear if a face cannot be located. Preview does not claim a successful seal match.

No camera frames or photos are stored or uploaded. Calibration stores normalized landmark vectors in this browser's localStorage; Clear samples removes them. Position preferences also stay locally. Vision assets are downloaded during setup from Google and served from this app's own origin at runtime.

## Project map

- `src/App.tsx`: selected technique, calibration, sequence and effect state.
- `src/AppView.tsx`, `src/view.css`: synthesized arena interface.
- `src/FloatingPanel.tsx`: move/resize controls and persisted geometry.
- `src/runtime/`: worker, camera lifecycle, classifier, sequence logic, Canvas renderer.
- `docs/`: research, canonical JSON/schema, design decisions and implementation notes.
- `evidence/`: retained desktop/mobile/browser proof.

Browser action traces are retained locally under `evidence/verification/` and excluded from Git. Screenshot evidence is included.

See [docs](docs/README.md), [implementation](docs/implementation.md) and [arena synthesis](docs/arena/synthesis.md).

Reusable browser checks: [verification skill](.agents/skills/verify-naruto-ninja/SKILL.md). Keep the feature map current with `/maintain-verification-skill` as the app changes.
