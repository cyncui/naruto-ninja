# Field Study / Candidate 3 — Round two

A full-viewport camcorder feed with a movable, resizable frosted field-note window. Late-1990s identity comes from olive phosphor, cream acetate, rust-orange controls, a stamped wordmark, monospace operational labels and serif technique names. The camera is the canvas. There are no permanent sidebars and no primary-page scrolling.

The one sequence overlay uses the parent's FloatingPanel unchanged. Its translucent cream surface and backdrop blur resemble a marked-up transparency over the live image. Named sequence buttons preserve every repeated step. The bottom control strip stays compact; the searchable technique index and calibration open only as native modal dialogs. Escape closes them, and native dialog behavior returns focus to their launch control. On phones the input-mode toggle moves beneath the masthead, leaving one short bottom control row and clearance for the floating panel.

The user's revised direction replaces the earlier printed two-column layout. A full retro desktop with numerous floating windows was rejected because the subject's face and hands need open space. Glass is confined to the sequence and compact utility surfaces; the camera remains dominant.

## Run and integration

Run `npm install`, `npm run dev`; validate with `npm run build`.

Deliverables: `src/AppView.tsx` and `src/view.css`, using the supplied `src/FloatingPanel.tsx` and `src/panel.css` unchanged. The view consumes AppModel without contract changes. `src/main.tsx` supplies the independently runnable 81-technique mock and an original illustrated stage; the parent replaces that with actual camera/tracking/effects.

## Behavior and limits

Pending camera access exposes Cancel camera through stopCamera. Idle/error never display LIVE. Capture enables when camera and tracker are ready; it closes the calibration dialog and starts the parent's three-second countdown, giving time to return both hands to frame. Calibration explains the minimum three samples per pose and experimental local recognition.

All evidence, unknown sequences, source links, alternate variants, manual seal inputs, mirror and reduced motion remain reachable. Effect preview is expressly a simulation and does not claim reliable face attachment. The standalone mock does not pretend to run camera or recognition. No pose artwork is fabricated from the symbolic catalogue.
