# Naruto Ninja: living training scroll

## Brief

An existing browser playground for Naruto fans to rehearse researched hand-seal sequences, experiment with local camera recognition and preview original chakra effects. Keep React, TypeScript, Vite, MediaPipe and the floating panel: the interface serves practice, not a marketing funnel. English; desktop and 390px phone; keyboard, reduced motion and camera denial all work. No invented credentials or recognition accuracy claims. The 81 techniques and 95 variants come from the actual catalogue.

## Concepts considered

Scores: originality / fit / code feasibility / portability (lower portability is better).

- **Living training scroll.** A paper-and-ink practice sheet becomes charged as each seal is accepted. Signature: a zodiac seal circle fills in exact sequence order. Emotion: tactile, focused play. Screenshot: huge condensed practice statement against an orange seal circle and original shinobi figure. Anchor: Naruto's ordered zodiac hand seals. Scores: 4 / 5 / 5 / 1.
- **Chakra oscilloscope.** A dark instrument maps hand recognition to traces. Signature: tracked landmarks drive a waveform. Emotion: clinical experimentation. Screenshot: hands surrounded by recognition telemetry. Anchor: local normalized hand landmarks. Scores: 3 / 4 / 4 / 3.
- **Mission dossier.** The archive becomes a village field manual with technique tabs. Signature: techniques open like stamped mission sheets. Emotion: discovery. Screenshot: source-backed technique spread. Anchor: the researched catalogue and variant evidence. Scores: 4 / 4 / 5 / 2.

Choose the living scroll: it expresses ordered practice even before camera permission, and gives real progress a visual purpose.

## Concept card

Idea: A training scroll comes to life as you practice Naruto's hand seals.
Metaphor: An inked seal, charged one step at a time.
Signature: The actual sequence populates a circular seal; accepted steps charge its segments and completing practice activates the existing effect renderer. Progress is the single driver; GSAP soft easing settles the ring between steps.
Emotion: Focused, playful, ready to try.
Motion verb: Stamp, then settle.
Screenshot: Oversized “Hands first. Chakra follows.” alongside a charged orange seal and original practice figure.

## System

Palette: ground #f3f2ec, ink #202b36, muted #56616b, line #ccd0ca, accent #f46b2c, curtain #202b36. Orange comes from Naruto's training clothing, not an arbitrary signal color. Dark ink scrims carry camera text.
Type: self-hosted Google Fonts Barlow Condensed 700 for display, Manrope 400–800 for text. Display leading .9, tracking -.025em; body 16px/1.55; UI 12–14px. System mono only for step counts.
Grid: 12 desktop columns, 32px outer edge, left statement at column 1, seal centered near column 8, sequence panel bottom right. Phone: 4 columns, 16px outer edge, short heading above centered seal, panel below seal, four-action dock.
Shape: 4px functional radius, circles only for the seal and status marker. No glass surfaces on the paper practice UI.
Motion: GSAP ticker is the sole illustration/ring clock. power3.out for settling, 180ms target feedback, 600ms seal movement. No loader or scroll hijacking. Reduced motion holds a complete static seal, including progress; the manual setting pauses signature motion too. Camera tracking retains its frame capture scheduling because it is sensor acquisition, not decorative motion.

## Composition

Practice, poster + workspace:

```
[ identity                              feed / edition ]
[ Hands first.      [ zodiac seal + figure ]            ]
[ Chakra follows.                                     ]
[ short practice note           [ movable sequence ]  ]
[ guide / local privacy         [ sequence / status ]  ]
[                  camera / techniques / preview       ]
```

Field guide, asymmetric editorial then a numbered procedure:

```
[ identity                         practice / guide ]
[ A little training.     [ what the app actually does ]]
[ A lot of hand signs.                               ]
[ 01 manual ] [ instructions across a wide measure ]
[ 02 camera ] [ personal calibration and limitations]
[ 03 sources] [ references and honest effect notes  ]
[                 Open the training room            ]
```

404, single typographic statement:

```
[ identity                              field guide ]
[ 404 / This scroll went missing.                    ]
[                  Return to practice               ]
```

Genericness test: removed olive retro glass, desktop tool chrome and the standalone pixel landscape. The zodiac ring is derived from each actual activation variant, not decorative coordinates. The avatar is an original stylized illustration, explicitly not a hand-position reference. No explainer figure is needed; the working sequence is the explanation.

## Release assumptions

Production hostname is not configured in this repository. VITE_SITE_URL is the explicit deployment setting; canonical, JSON-LD and generated sitemap use it when set. Do not invent a public URL. Local implementation only; deployment is a separate action. No content placeholders, outside brand imagery or fabricated metrics.

## QA and finishing decisions

Repeated production screenshot passes cover home, guide, 404, keyboard focus, hover, reduced motion, navigation and throttled mobile performance. Separate critics review only screenshots and reports. Real-control supplements show partial sequence, completed sequence, searched library, calibration and short viewports.

The final pass removes crosshair ticks from the seal and the decorative privacy symbol. Guide and 404 stay still at rest: they are reading and recovery surfaces. Their link motion and the route curtain provide continuity. The practice seal breathes on the GSAP clock and pauses with reduced motion or active camera.

The orange display text uses a darker accessible shade (#b33d0b); the illustration and primary preview button retain #f46b2c. The phone help link has a reserved status-bar slot. Compact phones retain the full seal, a shorter movable panel, and visible practice feedback.

No production hostname was supplied. Canonical URLs and sitemap are generated only when VITE_SITE_URL is set to the actual public origin. Local audit warnings about that setting are intentional, and public deployment is pending.

Final usability refinements: the next seal centers in its scroll rail, phone and long desktop rows label horizontal scrolling, manual Demo rehearsal is untimed, and Camera practice explains the eight-second reset. Calibration starts the camera directly and moves focus to the seal picker once tracking is ready. Markers shrink for long researched sequences, including the 44-step Water Dragon variant.

Long sequences use a quiet node ring with one legible active seal. Alternative research variants live in Source & notes so the practice viewport always keeps progress, reset and feedback. Demo explicitly rehearses tap order and assumes the visitor has a trusted hand-pose reference.

The active sign keeps a secondary-source reference link in the panel footer. Opening Source & notes scrolls its controls into view; normal and short phone layouts reserve enough room for progress feedback and practice guidance.
