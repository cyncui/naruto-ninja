# Candidate 1 — Field Camera

A late-1990s field instrument: sage camera tint, compact condensed lettering, vermilion controls, numbered seal tiles, and quiet registration marks. The user’s revised camera-first brief now drives the entire layout: stage fills the viewport, a compact masthead identifies the source, a bottom dock holds core actions, and one pale olive frosted-glass sequence panel floats over the image.

The supplied FloatingPanel owns drag, keyboard move/resize, persistence, and viewport constraints. Its behavior files are unchanged. The sequence panel can scroll internally at small sizes, repeated seals have distinct step numbers, and evidence/alternate sequences expand on demand. Zodiac characters label seals and are explicitly not hand-position instructions. The catalogue and calibration live in native modal dialogs with Escape dismissal, focus containment, and return focus, avoiding permanent sidebars or primary page scrolling.

Rejected directions: simulated desktop windows would distract from the camera; a fixed catalogue would contradict the revised brief; continuous neon animation would reduce camera legibility. Glass is limited to the useful overlays, with solid parchment dialogs for extended reading. Important body text starts at 12px. Smaller typography is limited to secondary metadata.

Camera pending state exposes Cancel. Idle and error states never claim LIVE. Calibration enables on live camera plus ready tracker, explains the 3-second countdown and three samples per pose, and closes the dialog on capture so both hands can return to frame. Recognition is labeled personal and experimental. Preview is explicitly a simulation; eye and face effects do not imply reliable face tracking.

Run `npm install`, then `npm run dev`; production check is `npm run build`. The standalone mock loads all 81 catalogue techniques and demonstrates UI behavior without a camera runtime or fabricated tracking. Parent supplies actual camera, sequence, effects, and calibration behavior. Camera privacy, asset loading, face tracking, and recognition performance are runtime concerns outside this artifact. Native dialog dismissal does not discard catalogue filters.

Validation: TypeScript and Vite production build passed after the fullscreen revision; no remote assets or font requests are required. Parent performs rendered desktop/mobile comparison.
