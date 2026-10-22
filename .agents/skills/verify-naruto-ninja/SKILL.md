---
name: verify-naruto-ninja
description: Verify Naruto Ninja in the browser (seal practice, floating sequence panel, technique catalogue, camera and model startup, personal calibration, seal arena drill and ?record session recording) after UI or runtime changes, by driving the production build with Playwright.
---

# Verify Naruto Ninja

## Launch

Run from the repository root with Node 24+. On a fresh checkout, run `npm ci` and `npx playwright install chromium`. Run `npm run build` before browser verification.

For a complete drive, run `npm run test:e2e -- --trace on`. For one mapped feature, run `npm run test:e2e -- --grep "manual practice" --trace on`. The Playwright configuration launches the production preview on `http://127.0.0.1:4173`, waits for HTTP readiness, and terminates its own server when finished. It refuses to reuse an occupied port. Initial setup downloads checksum-verified model assets; this is not an offline installation.

## Doctor

The manual-practice test first requests `/` and asserts that the visible level-one heading contains `Fireball` and the effect stage is inactive. This is the read-only identity/readiness check before any user actions. If driving an already-running instance manually, `curl -fsS http://127.0.0.1:4173/` must return the prerendered app document; then check the same visible heading. A responding unrelated service is not permission to drive it. Do not stop or reuse a server another task owns.

## Drive

Use [features/README.md](features/README.md) to choose coverage. The maintained harness is `tests/browser/app.spec.ts`; selectors are roles and accessible names, with `data-testid="effect-stage"` for observable renderer state. It uses fresh browser contexts, Chromium synthetic media and isolated localStorage. The real-worker case loads actual WASM and hand/face models. The calibration case substitutes only the worker boundary to provide controlled landmark fixtures; it proves the capture workflow, not classifier accuracy.

## Evidence

Exercise real controls rather than setting React state. Retain both action and result: `--trace on` records clicks, assertions, network and DOM snapshots. Copy `test-results/` into `evidence/verification/last-run/` after the run, before another test run overwrites it. `test-results/` and `evidence/verification/` are ignored by Git. The harness also saves `evidence/app-desktop-before.png`, `app-desktop-cast.png`, `app-mobile.png`, `app-panel-moved.png`, `app-camera.png` and `app-calibration.png`; those screenshots are tracked, and every run rewrites them. Look at them as proof, then run `git checkout -- evidence/*.png` unless the change is meant to update the committed screenshots.

Manual practice also observes network requests and asserts no vision/model assets are loaded. Camera shutdown asserts that every captured MediaStreamTrack ends. Calibration checks stored vector counts and clearing during a pending countdown. The arena checks the stored best round, and recording parses the downloaded JSONL and checks calibration storage stays empty. A screenshot alone does not prove those side effects. Synthetic camera coverage does not establish human gesture accuracy, face alignment on a person, Safari support or device frame rates.

## Cleanup

Playwright owns and shuts down the preview server it starts (`node scripts/serve.mjs --port 4173`). Check `lsof -nP -iTCP:4173 -sTCP:LISTEN` after the run: no listener should remain. If interrupted, stop only the process tree created by that test command; never kill by process name. Browser contexts discard their scratch profiles. Preserve `evidence/` and copied traces. After cleanup, verify `evidence/app-desktop-cast.png` and the copied `trace.zip` still exist.

## Helpers

No additional helper is needed. `playwright.config.ts` manages launch and cleanup; `npm run test:e2e -- --grep "panel drag" --trace on` drives only panel geometry. Use `npx playwright show-trace <path-to-trace.zip>` to inspect a retained trace. Update this map whenever accessible names or user paths change; `/pstack:maintain-verification-skill` can maintain it. Claude Code reads this skill through the `.claude/skills/verify-naruto-ninja` symlink; edit it here.
