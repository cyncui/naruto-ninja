# Candidate 02, round two — Hand Seal Laboratory

The camera now fills the viewport. There are no sidebars, permanent catalogue, or page scroll. A narrow dark masthead and a compact bottom control strip leave the image open; the sequence lives in one movable, resizable frosted-glass instrument window.

The late-1990s identity comes from Japanese game-manual lettering, an original vermilion seal, hard-edged controls, warm gray-green glass, and restrained inset borders. The requested glass is functional: the scene remains visible through the sequence, while backdrop blur and sufficient opacity preserve text contrast. This replaces the prior paper-and-ledger layout entirely.

I rejected neon hologram decoration and a multi-window desktop because they would obscure the camera. The original hand-seal lab identity survives through typography, ink/vermilion colors, and numbered rehearsal steps rather than a busy desktop metaphor.

## Artifacts and run

Integration artifacts: `src/AppView.tsx` and `src/view.css`. They use the supplied, unchanged `FloatingPanel.tsx` and `panel.css` for bounded positioning, pointer/keyboard movement and resizing, reset, and persistence. `src/main.tsx` remains a standalone fixture using all 81 real catalogue records and an original SVG demonstration figure.

```sh
npm install
npm run dev -- --port 4172
npm run build
```

## Behaviors

- The catalogue is a native modal dialog with search across technique, family, and nature, a collection filter, selected state, and one-click selection. Closing or Escape uses native focus restoration.
- Calibration and preferences occupy another native modal. Capture enables when camera and tracker are ready, gives a three-second countdown instruction, and requires three examples per pose with both hands visible at capture time.
- Pending camera requests can be canceled. Idle/error modes are never called live.
- Every repeated sequence step retains its own number and clickable practice input. Source evidence and notes expand inside the panel.
- Completing practice is separate from effect preview. Preview is explicitly a simulation; no promise of eye/face tracking or trained Naruto recognition is made.
- Important content is at least 12px, with roughly 40px action targets, visible focus, native controls, status/error regions, and reduced-motion support.

## Validation and limits

TypeScript and Vite production build pass. Actual camera, inference, delayed capture, calibration storage, and effects are owned by the parent runtime; the standalone fixture does not claim to implement them. The provided floating panel can overlap controls when manually moved there; its positioning behavior is preserved without edits. Mobile uses a single bottom row with the mode switch in the masthead, leaving the default panel resize handle unobscured; the panel remains internally scrollable at small sizes.
