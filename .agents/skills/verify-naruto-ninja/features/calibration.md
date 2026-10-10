# Personal calibration

## Sub-features

Three-second capture; three examples per pose; dialog closes for capture; local vector storage; clear cancels pending capture.

## How to get to it (user POV)

Start camera, open Calibration, select Seal to teach, and click Capture in 3 seconds. Put both hands in frame and hold until capture finishes. Reopen Calibration to see counts or clear saved examples.

## Driving it with Playwright

Run `npm run test:e2e -- --grep "calibration countdown" --trace on`. A controlled worker fixture supplies two-hand landmarks while real camera permission and UI run normally. Select rat and capture three times, asserting the dialog closes and stored rat vectors reach 1, 2 and 3. Start another capture, reopen Calibration, click Clear saved examples and confirm storage remains empty after the countdown would finish.

## Gotchas

The fixture proves storage and lifecycle behavior only. It does not prove valid Naruto poses or accuracy. Samples contain normalized vectors, never photos. Preferences are Mirror camera feed and Reduce effect motion; phone coverage checks the OS reduced-motion default.
