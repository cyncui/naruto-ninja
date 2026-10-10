# Private selection rubric

Score each criterion from 1 to 5, giving concrete evidence.

1. Specific late-90s visual identity: deliberate typography, hierarchy, original composition; no generic dashboard/card-grid/gradient styling.
2. Camera-first usability: viewfinder gets priority, activation path is legible, controls useful during camera use.
3. Honest, complete interactions: distinct camera/demo states, readable sequence progress, catalogue and effect previews, errors and training explained without fake recognition.
4. Responsive/accessibility quality: usable at 390px and 1440px, keyboard controls, contrast, reduced motion.
5. Maintainability: clean typed view boundary, minimal dependencies, no fabricated engine logic, adaptable layout.

Contract: each candidate builds an independently runnable React/TypeScript presentation against shared AppModel props. Parent supplies production camera, tracking, sequence and effects engine, then integrates the chosen view. Candidates receive the task and API, not this rubric.

Round two: the user requires a full-viewport camera, no sidebars, and movable/resizable frosted-glass sequence overlay. Camera-first criterion now means minimal obstruction, on-demand catalogue/calibration, usable floating panel at390px and1440px. Glass is specifically authorized. All other criteria remain. Parent provides the same FloatingPanel implementation to each candidate.
