# Trained seal classifier plan

Planned October 21, 2026. Milestone 1 is built and Milestone 2 is scaffolded. Nothing has been measured on real recordings yet. It replaces nearest-example calibration with a small trained model, following the pipeline proposed in [browser-vision-stack-research.md](browser-vision-stack-research.md).

## Why

Both matchers today are nearest-example lookups over a user's own samples:

- **Landmarks** ([recognition.ts](../src/runtime/recognition.ts)): 42 or 84 normalized coordinates, RMS distance to the closest of 3–12 samples per seal, accepted under `MATCH_LIMIT = 0.16` with a `MATCH_MARGIN = 0.035` lead over the runner-up.
- **Image embeddings** ([embedding.ts](../src/runtime/embedding.ts)): MobileNet v3 crop embeddings, cosine distance, `IMAGE_MATCH_LIMIT = 0.2`, `IMAGE_MATCH_MARGIN = 0.02`.

Three problems follow from that design:

1. **One global threshold for every seal.** Lookalike seals and distinct seals share the same limit and margin, so it is either too loose for the first or too strict for the second.
2. **No negative class.** "Not a seal" is whatever falls outside the limit. Hands at rest or moving between seals can sit nearer to a seal than the limit.
3. **No measurement.** Neither matcher has a confusion matrix, false-trigger rate or tracking-coverage figure. The thresholds are provisional ([implementation.md](implementation.md)) or guessed ([image-matcher-spike.md](image-matcher-spike.md)).

A trained classifier learns per-pair boundaries and a `none` class, and a recorded dataset makes every claim measurable.

## Pipeline

```text
record (in app) → JSONL sessions → features → baseline eval of current matchers
                                            → train MLP → eval → export JSON weights
                                            → TypeScript forward pass → Diagnosis
```

The model returns the existing `Diagnosis` type, so the readout, `StableSeal`, sequence matching and teaching UI do not change.

## Milestone 1 — recording mode

Goal: labelled, session-tagged frame data, including failures.

**Status: built** ([RecordPanel.tsx](../src/RecordPanel.tsx), [recording.ts](../src/runtime/recording.ts)). Open `/?record`, start the camera, pick a label and length, then Record (one clip) or Record all from here (every label in turn, 3 s countdown each). Recording pauses hands-free teaching and practice. Each image embedding is stored once, on the frame it arrived with. Handedness is recorded raw: MediaPipe labels it as if the image were mirrored, and the worker's frames are not. A full-sequence clip (`sequence:<variant>`) records the selected technique with its steps. In a fake-camera run, a 5 s clip held 75 frames, 38 of them with embeddings; handedness has not yet been checked with real hands.

- `?record` opens a recording panel in Camera mode. Pick a label, press record, hold or move, stop. Labels are the 12 seals plus:
  - `none:rest` — hands down, relaxed, in lap, out of frame.
  - `none:transition` — moving between two seals.
  - `none:lookalike` — near-miss poses (fist, prayer hands, interlaced fingers that aren't a seal).
- Each frame appends one line from the existing `onFrame` callback in [App.tsx](../src/App.tsx):
  `{ t, label, hands, aspect, handedness, embedding? }`. Frames with zero hands are kept; tracker failure is data.
- Handedness is not posted by [vision.worker.ts](../src/runtime/vision.worker.ts) today. Add it to the `result` message.
- The first line is session metadata: `{ session, person, device, lighting, camera, matcherVersion, date }`.
- Stop downloads `session-<id>.jsonl` via a Blob. Recordings live in `data/recordings/` and are git-ignored. They hold landmarks and embeddings, never pixels.
- Recording other people needs their consent and a pseudonymous `person` id.

Done when: one session of all 15 labels can be recorded and re-read by a script, with zero-hand frames present.

**Starting data target** (a guess to revise after the first confusion matrix, not a requirement): about 10 s per label per session at the ~15 Hz tracker rate, 6+ sessions of the main user across rooms, light and distance, plus 2–3 other people for a stranger test.

## Milestone 2 — baseline evaluation

Goal: numbers for the current matchers before training anything.

**Status: scaffolded, waiting on recordings** ([training/](../training/)). Put sessions in `data/recordings/`, then run `uv run baseline.py` from `training/` to write `docs/eval/baseline.md`. Each session calibrates in turn, using the first 3 steady holds per seal as hands-free teaching takes them (`--samples` up to 12), and every other session is replayed against it. With one session the report calibrates and tests on the same frames and says so. The image matcher is scored only when frames carry embeddings, which needs `?matcher=image` while recording. `features()`, both `diagnose` functions, `StableSeal`, `advanceSequence`, `SteadyCapture` and the JSONL loader are ported to [matchers.py](../training/matchers.py) and [load.py](../training/load.py). The parity tests (`uv run pytest`) check them against the app's own outputs, which `npm run fixtures:training` writes to `training/tests/fixtures/parity.json`. Regenerate that file whenever those functions change. The tests don't cover `MATCH_MARGIN` or `IMAGE_MATCH_MARGIN` exactly: no fixture pose has a runner-up gap close to either value. The port lives in `matchers.py` rather than the `features.py` named below. NumPy, scikit-learn and PyTorch wait for Milestone 3, since the baseline doesn't need them.

- `training/` folder, Python managed with `uv`, NumPy + scikit-learn + PyTorch. Kept out of the web build.
- `load.py` reads sessions into frames with labels, session and person.
- `features.py` ports `features()` from `recognition.ts` exactly, with a parity test against vectors produced by the TS function on the same input.
- `baseline.py` simulates calibration: for each held-out session, take 3–12 steady frames per seal from a *different* session as templates, then run the nearest-example rule with the shipped thresholds over every frame. Repeat for the image matcher using recorded embeddings.
- Report per run:
  - per-seal precision and recall, and a confusion matrix including `none`
  - tracking coverage per seal: share of frames with 0, 1 and 2 hands
  - false triggers per minute: run predictions through a Python port of `StableSeal` over `none` clips
  - sequence success on continuous recordings of full techniques

Done when: `uv run baseline.py` writes a markdown report to `docs/eval/` for both matchers.

## Milestone 3 — training

Goal: a model that beats the baseline on held-out sessions.

- **Input.** Fixed size: two hand slots (sorted left to right, as today) × 21 points × 2, plus a presence flag per slot; missing hands are zeros. Two feature sets to compare:
  - A: the raw normalized coordinates (what the matcher uses now).
  - B: A plus per-hand finger joint angles and fingertip distances between hands, all scale-invariant.
- **Model.** MLP, input → 64 → 32 → 13 (12 seals + `none`, with the three `none:*` labels merged). About 10k weights. Light augmentation: small rotation, scale, jitter, mirror only if handedness is swapped consistently.
- **Splits.** By session for personal accuracy, by person for the stranger test. Never random frames: adjacent frames are near-duplicates and inflate accuracy.
- **Rejection.** Accept when top probability ≥ `p` and leads the runner-up by `m`. Choose `p` and `m` on a validation split to hit a target false-trigger rate, not by hand.
- **Image head (optional).** Same MLP on the 1024-float embeddings, and a late fusion of both heads for seals where coverage shows tracking collapses. Only pursue if Milestone 2 shows landmark coverage is the main failure.

Done when: the eval report shows the model and baseline side by side on the same held-out sessions, with the chosen `p`, `m`.

## Milestone 4 — ship in the app

- Export weights, feature normalization and `p`/`m` to `public/models/seal-mlp.json` with a version and the eval report's commit.
- `src/runtime/classifier.ts`: load JSON, dense layers + ReLU + softmax in plain TypeScript, `diagnoseModel(hands, aspect, model): Diagnosis`. No ONNX or TF.js runtime: for 10k weights the runtime would outweigh the model.
- Parity test in `tests/`: fixture inputs with expected probabilities from PyTorch, tolerance 1e-5.
- `?matcher=model` alongside `landmarks` and `image`. Personal calibration stays available as a fallback and for seals the model rejects.
- Measure forward-pass time in the browser before deciding main thread vs worker.

Done when: the model runs in Camera mode, unit tests pass, and the app's readout shows model probability instead of distance.

## Later

- Fine-tune the last layer on a user's calibration samples in the browser.
- Reuse the recorder, eval and model for the gesture-driven sound/visual piece (Obsidian skill-building ideas, #1).

## Open questions

- Do `none:lookalike` poses need their own class, or does a merged `none` hold up?
- Is two-slot sorting by wrist x stable for clasped seals that track as one merged hand?
- ~~How much does the stranger test drop versus personal sessions?~~ The app is personal, so the stranger test is optional; held-out personal sessions are the measure that matters.
