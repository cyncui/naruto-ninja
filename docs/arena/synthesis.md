# Arena synthesis

The final app uses a full-viewport camera, one movable/resizable frosted sequence window, and on-demand catalogue/calibration dialogs. This follows the user's revised direction; the initial sidebar layouts were retired.

## Selection

Three independent inherited-model workers produced two rounds. All candidates were read end to end, built, and captured at 1440×1100 and 390×844. Round two used the same selected Great Fireball technique. No candidate dropped out.

The first independent judge and parent both chose candidate 2. In the fullscreen round, the judge preferred candidate 1 by one point; the parent retained candidate 2. The disagreement was about emphasis: the judge valued candidate 1's stronger camera action, while the parent valued candidate 2's simpler state and consistently styled panel. Candidate 1 duplicated effect-origin state in the view (`previewRequested`), which could drift after runtime events. Candidate 2 remained the cleaner integration base; its camera action was improved using candidate 1's design.

| Criterion,1–5 | Parent C1 | Parent C2 | Parent C3 | Judge C1 | Judge C2 | Judge C3 |
|---|---:|---:|---:|---:|---:|---:|
| Late-90s identity |4|4|3|4|4|3|
| Camera-first usability |4|5|4|5|4|4|
| Honest interactions |4|4|4|4|4|4|
| Responsive/accessibility |3|4|3|4|4|3|
| Maintainability |4|5|4|4|4|4|
| Total |19|22|18|21|20|18|

## Grafts

- **Candidate 1:** zodiac glyph identifiers alongside named seals; prominent vermilion camera action; camera notices shown only when useful, not a permanent idle notification. Glyphs remain labels, never fabricated hand-position diagrams.
- **Candidate 3:** calibration closes before the three-second countdown; free-seal practice palette stays behind a disclosure.
- **Parent integration:** shared pointer/touch/keyboard panel movement and resizing, persistence and viewport constraints; an explicit scroll/resize hint; current-step scrolling; shorter technique headings; local camera/worker/calibration/sequence runtime; original pixel practice scene and illustrative effects.

Rejected: permanent sidebars, decorative Form/Focus/Cast copy over the camera, multiple floating tool windows, stale view-owned effect state, midword seal wrapping, mock-stage styles and claims of pretrained Naruto recognition. The three candidates converged on a restrained game-manual/camcorder vocabulary; this was a comparison of layout and interaction approaches within that direction.

## Evidence and verification

Candidate source/rationales are retained under [candidates](candidates/). Round-one screenshots are in [evidence/arena](../../evidence/arena/); final candidate screenshots are in [round-two](../../evidence/arena/round-two/). Final runtime browser evidence is in [evidence](../../evidence/).

The synthesis is verified through the project build and Playwright suite. See the verification record below for final results and limitations.

### Final verification record

- `npm run build`: passed catalogue validation (33 signs, 81 techniques, 95 variants, 85 sources), TypeScript, all six unit tests and production bundling.
- `npm run test:e2e -- --trace on`: all seven browser cases passed. Covers manual order/reset, catalogue search and unresolved/repeated seals, distinct Sharingan/Byakugan previews, phone layout/reduced motion, pointer/keyboard panel geometry and persistence, permission denial, actual hand/face workers, camera track shutdown and calibration countdown/clear behavior.
- Desktop and phone screenshots were visually inspected. Camera/face-model startup used Chromium synthetic media. Calibration uses a controlled landmark fixture at the worker boundary. Neither establishes real-human sign accuracy or face alignment; physical-device Safari/mobile performance remains unmeasured.
- The project-local [verification skill](../../.agents/skills/verify-naruto-ninja/SKILL.md) was exercised end to end through its managed Playwright command, including initial app identity checks, real UI actions and cleanup. Successful action traces remain locally in `evidence/verification/last-run/` after server shutdown and are excluded from Git.
- Review fixes include canceling pending capture when clearing samples, ignoring old tracker failures after restart, isolating the optional face task in a separate worker and keeping optional face-copy failures from stopping hand inference.

No generated franchise imagery, pretrained Naruto classifier, general recognition accuracy or measured frame-rate claim is part of this preliminary build.

### Publication cleanup

Before the first public push, the deslop pass removed redundant view fallbacks, repeated browser-test casts, an unused worker message field, and unnecessary CSS overrides/priority flags. The build, six unit tests and seven browser cases passed again. Screenshots are versioned; downloaded vision assets and local action traces are ignored.
