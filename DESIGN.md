# Naruto Ninja: hand seal synchronization test

## Brief

An existing browser playground for Naruto fans to rehearse researched hand-seal sequences, experiment with local camera recognition and preview original chakra effects. Keep React, TypeScript, Vite, MediaPipe and the floating panel: the interface serves practice, not a marketing funnel. English with Japanese labels; desktop and 390px phone; keyboard, reduced motion and camera denial all work. No invented credentials or recognition accuracy claims. The 81 techniques and 95 variants come from the actual catalogue.

## Direction

A faithful homage to the NERV monitor screens in _Neon Genesis Evangelion_, replacing the earlier paper "living training scroll". The user rejected the paper look as generic. Three reference frames, from Are.na blocks 740482, 740483 and 740485, set the bar:

- **Psychographic display.** Black field, green crosshair grid, orange numbered rulers on the edges, labels inside orange outline boxes, and a red "DANGER" plate.
- **Mental toxicity level.** Huge condensed red-orange headline, monospace readouts, and "SUBJECT 00/01/02" rows beside blue-to-violet segmented bar meters.
- **Internal power clock.** A seven-segment amber countdown, a "内部 INTERNAL" plate, red/black hazard stripes, and a STOP / SLOW / NORMAL / RACING plate row.

Practice becomes a sync test: seal progress is the "sync ratio", the sequence is a pilot readout, and the practice figure sits inside a targeting reticle. The interface is dark only.

## System

Palette (tokens in `src/view.css`): void #050505, plate #0c0805, amber #ff8a1e (primary phosphor), amber-hi #ffb347 (headings), amber-dim #8a4a12 (rules and idle outlines), text #f7c995, muted #c98a4e, red #ff3b2a (warnings, the RACING-style preview action, headline second lines), green #5dff8f (grid, on states, completed seals, focus ring). Meter segments run hsl 192→266. Green is never decoration on text. Red always means warning or the primary effect action.

Type: Barlow Condensed 700 (Display) for every label, uppercase, positive tracking. Barlow Condensed 500 (Text) for prose. Share Tech Mono (Readout) for telemetry, counts and small print. Shippori Mincho B1 800 (Mincho) for all Japanese, in the style of the series' title cards. The Mincho file is a subset of only the glyphs used in `src/`. Run `node scripts/subset-jp-font.mjs` after adding Japanese copy. Numerals in the sync readout are a custom SVG seven-segment display (`src/SevenSegment.tsx`) with ghosted unlit segments.

Shape: zero radius everywhere. 1.5px outline plates, filled plates for active or pressed states, soft phosphor glow (`--glow`) on headings and active elements only. Hazard stripes mark the masthead, dialog and panel bars, and the privacy warning.

Texture: the viewfinder overlay carries a 96px green crosshair grid, a vertical rule every four cells, 3px scanlines and a vignette. It dims while the camera is live. The practice figure is drawn as an amber duotone in `Stage.tsx`.

Motion: GSAP ticker is the sole illustration and ring clock. The reticle markers ease with power3.out between steps. The live camera pilot light blinks in steps. Buttons swap fill in 120ms with no lift. Reduced motion holds everything still, including the blink.

## Seal diagrams

While a sequence is in progress, the reticle shows a schematic of the next seal instead of the practice figure (`src/SealDiagram.tsx`, data in `src/seal-guide.ts`). Hands are built from parts: a chamfered palm, four fingers that are either extended or curled, and a thumb in one of six positions. Each hand gets a green L/R tag and is drawn from the performer's point of view. Fingers that matter are filled amber. Green leader lines run to callout labels outside the reticle on desktop. The panel carries a written "How to" line at every size. Every composition is auto-fitted to the reticle. The practice figure returns only when a technique casts or a step has no diagram.

Guidance is paraphrased from the twelve-seal databook chart reproduced on Narutopedia's Hand Seal page and linked from Source & notes. The schematics are simplified; they are not traced artwork, and catalogue `geometryStatus` stays `reference_required` because they are not classifier geometry.

## Icons

`src/Icon.tsx` replaces every Unicode arrow, check and box glyph with stroked glyphs on a 16-unit grid: square caps, mitred joins, and chamfered corners where a curve would be. They use `currentColor`. Native select arrows are replaced with the same chevron.

## Composition

Practice:

```
[ 忍 NARUTO/NINJA plate ][ hazard ]        [ 模擬 DEMO / SIMULATION ][ PILOT : YOU ]
[ ruler ][ readout tags                                                        ]
[ +12   ][ 印契同調試験              [ targeting reticle + amber figure ]       ]
[  …    ][ HAND SEAL / SYNCHRONIZATION TEST                                    ]
[       ][ 同調率 SYNC RATIO  [7-seg 033.3] %                                   ]
[       ][ SUBJECT 00 SEALS ▮▮▮▮▯▯▯ …               [ 印契配列 HAND SEQUENCE ]   ]
[ +01   ][ 手引 FIELD GUIDE / 内部 INTERNAL plate     [ movable panel        ]   ]
[       ][        [ DEMO|CAMERA ][ START CAMERA ][ TECHNIQUES ][ PREVIEW ][ CALIBRATION ] ]
[ -10 +0 +10 … +110 ruler                                                      ]
```

Phone keeps the kanji title, the reticle, the panel and a four-plate dock. Rulers and telemetry drop out. On short phones the title and subtitle share one line.

Field guide: a "SECTION 00" kicker, then 忍術訓練手引書 over SHINOBI / TRAINING MANUAL, with a BRIEFING plate. Numbered SECTION rows carry Japanese headings and red 注意 NOTE callouts. A red hazard-striped privacy warning follows, then an amber footer CTA.

404: ERROR 404 / PATTERN UNKNOWN, then 信号途絶 over SCROLL / SIGNAL LOST, with a red WARNING plate and a return CTA.

## Honesty constraints carried over

The practice figure is an original illustration and is labelled as not a pose reference. Zodiac characters label seals; they are not hand diagrams. "DATA ANALYZED ON THIS DEVICE" and "INTERNAL / LOCAL PROCESSING" state the real local-only processing; no MAGI or accuracy claims. The CHAKRA meter reflects only whether the visual simulation is active.

## Release assumptions

Production hostname is not configured in this repository. VITE_SITE_URL is the explicit deployment setting; canonical, JSON-LD and generated sitemap use it when set. Do not invent a public URL. Local implementation only; deployment is a separate action.

## Usability decisions kept from the scroll design

The next seal centers in its scroll rail. Phone and long desktop rows label horizontal scrolling. Manual Demo rehearsal is untimed, and Camera practice explains the eight-second reset. Calibration starts the camera directly and focuses the seal picker once tracking is ready. Long sequences, such as the 44-step Water Dragon variant, use tiny ring markers with one legible active seal. Alternative research variants live in Source & notes, so the panel always keeps progress, reset and feedback in view. The active sign keeps a secondary-source reference link in the panel footer.
