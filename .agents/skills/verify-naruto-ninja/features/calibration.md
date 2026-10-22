# Personal calibration

## Sub-features

Three-second capture; three examples per pose; dialog closes for capture; local vector storage; clear cancels pending capture; experimental image matcher.

## How to get to it (user POV)

Start camera, open Calibration, select Seal to teach, and click Capture in 3 seconds. Put both hands in frame and hold until capture finishes. Reopen Calibration to see counts or clear saved examples. Open `/?matcher=image` to switch to the experimental image matcher (remembered until `/?matcher=landmarks`).

## Driving it with Playwright

Run `npm run test:e2e -- --grep "calibration countdown|calibration starts" --trace on`. A controlled worker fixture supplies two-hand landmarks while real camera permission and UI run normally. Select rat and capture three times, asserting the dialog closes and stored rat vectors reach 1, 2 and 3. Start another capture, reopen Calibration, click Clear saved examples and confirm storage remains empty after the countdown would finish.

## Gotchas

The fixture proves storage and lifecycle behavior only. It does not prove valid Naruto poses or accuracy. Samples contain normalized vectors, never photos. Preferences are Mirror camera feed and Reduce effect motion; phone coverage checks the OS reduced-motion default.

Calibration can start the camera in place using `Start camera for calibration`. Once tracking is ready, focus moves to `Seal to teach` and capture becomes enabled. The focused browser case `calibration starts the camera in place` exercises this path with the actual vision worker and synthetic media.

The image matcher stores 1024-number crop embeddings under `naruto-ninja.image-calibration.v1`, separate from the landmark store `naruto-ninja.calibration.v1`. Run `npm run test:e2e -- --grep "image matcher" --trace on`: it waits for `IMAGE MATCHER · CROP` in the camera readout, captures Snake, expects status `Saved 1 sample for Snake (image crop:` and one 1024-length sample, confirms the landmark store stays empty, then switches back with `/?matcher=landmarks` and expects no image-matcher tag.
