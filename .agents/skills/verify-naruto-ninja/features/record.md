# Session recording

Record mode collects labelled clips of tracked hands for training a seal model. It records landmarks, handedness and image embeddings, never video, and exports them as a JSONL download.

## Sub-features

- `record-open` opens the `Recorder` panel when the page URL has `?record`.
- `record-clip` runs a 3-second countdown, then records one labelled clip of 5, 10 or 20 seconds.
- `record-batch` records every label from the selected one onward with `Record all from here`.
- `record-export` downloads `session-<date>-<person>-<id>.jsonl` with a session line, clip lines and frame lines.
- `record-isolation` keeps recording from teaching calibration or advancing practice.
- `record-session` locks session details after the first clip; `New session` starts over after a confirm.

## How to get to it (user POV)

- Open `/?record`. The `Recorder` panel appears over the app; its title bar collapses it.
- Choose `Start camera` in the bottom dock and wait for tracking. `Record` stays disabled until then.
- Fill `Person`, `Place`, `Lighting` and `Notes`, pick `Label` and `Length`, then choose `Record`.
- Use `Discard last clip`, `Download .jsonl` and `New session` below the clip table.

## Driving it with Playwright

Preconditions:

- The production build is current, model assets are present (`npm run prepare:vision` runs before build), and nothing listens on port 4173.
- A fresh browser context with Chromium synthetic media from `playwright.config.ts`.

- **Run the case.** Run `npm run test:e2e -- --grep "record mode" --trace on`. Exit code `0` and `1 passed`.
- **Open and start.** The case loads `/?record`, clicks `Start camera`, and waits up to 45 seconds for `Record` in region `Recorder` to be enabled.
- **Record a clip.** It fills `Person` with `p1`, selects `Label` `none:rest` and `Length` `5`, and clicks `Record`. The recorder status shows `Not a seal · rest`, then the clip table lists it.
- **Check isolation.** It requires `naruto-ninja.calibration.v1` to stay unset after recording.
- **Proof of the export.** It clicks `Download .jsonl`, requires the filename to match `session-YYYY-MM-DD-p1-…`, and parses every line: a `session` line (version 1, person p1), a `clip` line labelled `none:rest`, and more than 20 `frame` lines whose count matches the clip, each with a handedness array and some with 1024-number embeddings.

## Gotchas

- The synthetic camera has no hands, so frames carry empty landmarks. This proves capture, labelling and export, not landmark quality.
- Stopping the camera mid-clip ends the clip, because later frames would not be tracked.
- `New session` asks `Discard clips that were not downloaded?` with `confirm()`. Playwright dismisses dialogs by default, so a script must accept it with `page.once("dialog", (d) => d.accept())`.
- Unsaved clips arm a `beforeunload` warning; download first or accept the prompt before navigating away.
- `?record` is not remembered between visits.
