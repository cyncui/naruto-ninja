# Floating camera layout

## Sub-features

Full viewport stage; pointer and keyboard move/resize; reset; saved geometry; phone bounds and reduced motion.

## How to get to it (user POV)

Drag Hand sequence by its title bar. Resize using the lower-right corner. Focus either handle and use arrow keys; Shift makes larger changes. Use the title-bar reset button to restore geometry.

## Driving it with Playwright

Run `npm run test:e2e -- --grep "panel drag|phone has" --trace on`. Use region `Movable hand sequence`, buttons `Move sequence panel: HAND SEQUENCE`, `Resize sequence panel` and `Reset panel position and size`. Check bounding boxes after drag, resize and reload. At 390×844, the stage fills the viewport and the panel stays within bounds without page overflow.

## Gotchas

Pointer tests locate the accessible handle before calculating drag coordinates. Wait for the resize event to update React before measuring. Geometry is stored under `naruto-ninja.panel.v1` in the isolated browser context.

The Field guide link sits in the phone status bar. At heights below 760px, the panel shortens to keep the practice illustration visible.
