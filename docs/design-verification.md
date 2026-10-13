# Living training scroll verification

Verified the production build locally on 2026-10-12. The redesign keeps the existing React/Vite, MediaPipe worker, local calibration and sequence engine.

## Functional checks

- Research schema validation, TypeScript and all six unit tests pass.
- All eleven Playwright browser cases pass against the production server. These cover ordered and repeated seals, untimed manual rehearsal beyond an eight-second pause, catalogue search and unresolved variants, panel movement/resize/persistence, camera denial and startup/shutdown, calibration, route focus/reduced motion, short phone layouts and 44-step sequences.
- The camera startup case runs the actual MediaPipe workers and models with Chromium's synthetic camera. Calibration uses controlled landmark fixtures. Neither establishes recognition accuracy on real people.
- Routes return 200 for `/` and `/guide`, and 404 for missing pages.

## Rendered checks

Home, field guide and 404 were inspected on desktop and phone, with keyboard focus, hover, reduced motion and route transitions. Additional captures show practice progress, long sequences, variants, calibration and short phone screens.

The final home capture reports no console errors, failed requests, horizontal overflow, small targets, hidden reduced-motion text, invisible focus stops or serious/critical axe violations. Hover checks show movement feedback on the sampled controls. Canvas-dependent contrast checks were inspected manually against the opaque UI surfaces; the lowest text ratio in the palette is 4.78:1.

Final throttled phone LCP is 1.080 seconds on home, 0.916 seconds on the guide and 0.932 seconds on the 404, all with CLS 0. Headless scrolling stays near 60 fps. These measurements describe the test environment, not a claim about physical devices.

The audit has zero failures and three warnings: canonical URLs on home/guide and a sitemap require `VITE_SITE_URL` to contain the actual production origin. No hostname is invented and no deployment was performed.

## Evidence

Tracked screenshots are in `evidence/`. Detailed screenshot reports and independent critique are retained locally in `.shots/finish/`; browser traces are in `evidence/verification/last-run/`. These transient directories are excluded from Git.

The interface assumes fans who already know the hand shapes. Demo rehearses tap order; the figure is illustrative. Seal references are marked as secondary sources. Vetted pose diagrams and physical-device camera testing remain useful follow-up work.

## Independent review

The final critic inspected screenshots and measured reports without reading implementation or design intentions. Scores: Design 7.8, Usability 8.1, Creativity 8.0, Content 8.0. Weighted total: 7.95/10. This is an internal review, not an Awwwards jury result, and remains below the skill's target of at least 8 in every category.

The largest remaining improvements are accurate active-seal pose guidance, a persistent technique identity while reading variant notes, and greater desktop prominence for active practice. These require useful product decisions and source verification rather than more decoration.
