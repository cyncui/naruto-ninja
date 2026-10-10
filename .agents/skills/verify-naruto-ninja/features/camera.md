# Camera lifecycle

## Sub-features

Permission request; denial recovery; actual hand and face model startup; stop and ended media tracks.

## How to get to it (user POV)

Click Start camera. Grant browser permission. For optional face tracking, choose Sharingan and click Preview effect. Click End camera to stop.

## Driving it with Playwright

Run `npm run test:e2e -- --grep "camera denied|real worker" --trace on`. The real-worker case waits for TRACKER: READY, observes face-ready from the real worker, captures the screen and asserts all stream tracks are ended after End camera. It also asserts no page errors. The denial case rejects getUserMedia at the browser boundary, checks the alert and verifies Demo preview still works.

## Gotchas

Use the two synthetic-media launch flags already in playwright.config.ts; do not grantPermissions on this Chromium build. The synthetic green camera has no face. Model loading can take up to 45 seconds. A human camera smoke test is still required for real alignment and accuracy.
