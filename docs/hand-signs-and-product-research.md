# Naruto camera app: hand signs and product direction

Researched October 9, 2026. User preference: live camera effects, including altered eyes, chakra aura, lightning, clones and face markings. This is research and a proposed implementation direction, not a working recognizer or an exhaustive verified catalogue.

## Recommended product

Build a camera-based jutsu playground: teach a seal or sequence, recognize it locally, and attach an authored effect to the user's hands, face or silhouette. Offer a guided mode with a selected technique first; add free casting once the recognizer can reject unrelated movement reliably. Clan collections are a useful navigation structure, but should not define the recognition model.

The official Naruto site confirms twelve zodiac-based hand signs. The shared sign vocabulary is the starting point, not twelve exclusive powers or twelve clan identifiers. The official material also describes substantially different abilities: palm-based Rasengan, Nara shadow techniques, Hyuga visual/physical techniques, and Yamanaka mental techniques. A single uniform sign-to-clan mapping would lose those distinctions. [Official hand-sign discussion](https://naruto-official.com/en/news/01_1429), [Rasengan](https://naruto-official.com/en/news/01_1802), [Nara](https://naruto-official.com/en/news/01_1910), [Hyuga](https://naruto-official.com/en/news/01_1817), [Yamanaka](https://naruto-official.com/en/news/01_2526).

Separate four concepts in the catalogue: **seal shape**, **technique sequence**, **clan/character association**, and **visual effect**. Several techniques can use a sign, and a technique may have several depicted variants. A shortcut that activates an eye effect is an app interaction, not evidence that the sign canonically grants that power.

## Base recognition vocabulary

The initial label vocabulary should cover these twelve names and common English aliases:

| Label | Alias |
|---|---|
| Rat | — |
| Ox | — |
| Tiger | — |
| Hare | Rabbit |
| Dragon | — |
| Snake | Serpent |
| Horse | — |
| Ram | Sheep |
| Monkey | — |
| Bird | Rooster |
| Dog | — |
| Boar | Pig |

The twelve-sign structure is confirmed by the official interview above. The name inventory is also used by the actual [Jutsu Master training project](https://github.com/Farrellhrs/naruto-jutsu-recognition), which documents its twelve class labels. Neither a model label list nor a fan diagram establishes the precise canonical finger geometry. Reference poses must be checked against the original work and then demonstrated by real hands for training.

Reserve additional labels for the crossed-finger clone seal and technique-specific gestures. Treat neutral hands, partial poses, transitions and tracking failure as rejection cases, rather than forcing every frame into one of the twelve classes. The official site explicitly refers to Naruto's Shadow Doppelganger hand sign in its [birthday event description](https://naruto-official.com/en/news/01_1623).

## Technique and effect candidates

The effects below are proposed visual interpretations. The primary sources establish the underlying abilities or associations; they do not establish every trigger sequence.

| Collection | Technique or ability | Proposed live effect | Trigger policy |
|---|---|---|---|
| Naruto / shared techniques | Shadow Clone | Duplicate the segmented user, with smoke and offset silhouettes | Dedicated clone gesture; verify reference pose |
| Uchiha | Fireball | Fire from a face anchor, warm illumination and heat distortion | Teach one verified sequence variant |
| Sasuke / Kakashi | Chidori | Lightning attached to the casting hand | Sequence followed by a hand pose |
| Nara | Shadow Possession | Animated shadow extending from the user's silhouette | Verify the depicted seal and variant |
| Hyuga | Byakugan | Pale eyes, restrained vein markings and a visual pulse | Selected mode plus an explicitly designed activation gesture |
| Yamanaka | Mind technique collection | Spirit trail, reticle or translucent silhouette | Separate Mind Transfer from Mind Transmission; verify each trigger |
| Naruto / shared techniques | Rasengan | Rotating energy sphere above the palm | Designed palm/charging interaction |

Primary references: [Shadow Clone gesture](https://naruto-official.com/en/news/01_1623), [Sasuke learning Fireball](https://naruto-official.com/en/news/01_1856), [Chidori](https://naruto-official.com/en/news/01_1715), [Nara Shadow Possession](https://naruto-official.com/en/news/01_1910), [Neji and Byakugan](https://naruto-official.com/en/news/01_1817), [Yamanaka Mind Transmission](https://naruto-official.com/en/news/01_2526), [Rasengan](https://naruto-official.com/en/news/01_1802).

Chidori is not a clan-wide exclusive just because Sasuke uses it. Rasengan is likewise used by several characters, as its official entry makes clear. Avoid automatically making every Naruto-associated effect an Uzumaki clan technique. For Sharingan, the official Boruto episode synopsis identifies it as an Uchiha bloodline ability; an arbitrary app seal would be a shortcut, not its canonical origin. [Official episode synopsis](https://naruto-official.com/anime/boruto/list/01_964).

Expanding across clans is primarily catalogue, training-data and effect-authoring work. It is not a reason to load a separate vision model per clan. Do not claim all-clan coverage until the supported technique list, its reference variants and real-world recognition have been checked.

## Exact sequence leads: provisional, not primary-verified

Accessible official pages did not provide an exhaustive sign-by-sign sequence database. Fan indexes were used to locate candidate sequences and original-work references; these leads must remain separate from verified canon:

- Fireball: **Snake → Ram → Monkey → Boar → Horse → Tiger**, listed in the [Narutopedia technique index](https://naruto.fandom.com/wiki/Fire_Release:_Great_Fireball_Technique). The official Sasuke column reproduces material from chapter 223, establishing his training and use, but not verifying this complete transcription.
- Chidori: **Ox → Hare → Monkey**, plus a longer alternative, listed in the [Narutopedia Chidori index](https://naruto.fandom.com/wiki/Chidori). The official database verifies the ability, not that exact sequence.
- Clone seal: crossed index/middle fingers, separate from the basic twelve, described in the [hand-seal index](https://naruto.fandom.com/wiki/Hand_Seal). The official event supports the existence of a recognizable clone sign; exact training geometry still needs a source-frame check.
- Mind Body Switch: a technique-specific gesture, with a manga debut reference to chapter 42 and technique references to chapters 72–73 in the [technique index](https://naruto.fandom.com/wiki/Mind_Body_Switch_Technique). Do not substitute the Ram sign listed for the different Mind Transmission technique.

Some fan pages were accessible only through indexed excerpts. No complete manga/anime sequence audit was performed. Before publishing tutorials, choose a specific manga/anime reference, check the frames and record any shortened or one-handed alternatives separately. An attractive hand-sign cheat sheet is not sufficient evidence.

## Catalogue structure

Each technique should record an ID, display names, associated clans/characters, element, trigger type, sequence variants, effect ID, required trackers and source provenance. Source provenance should include medium, chapter/episode, page/timecode when verified, and a verification status. Trigger types should distinguish a canonical sequence, a special gesture and an app-designed shortcut. Model examples need both performer and recording-session IDs so validation can hold out unfamiliar users.

For overlapping sequence prefixes, guided mode can disambiguate using the selected technique. Free casting needs a completion rule or a brief timeout. A held sign should count once; repeated signs require a release/transition rule. These are product and engineering recommendations.

## Implementation direction and first milestone

Use **Vite + React + TypeScript, MediaPipe Hand Landmarker, a custom joint-hand classifier, a sequence state machine and Three.js WebGL2**. Keep recognition in a worker and rendering outside React's per-frame state. Add face tracking for eyes/markings and person segmentation for cutouts/clones only when required. Details, alternatives, official technical citations and browser caveats are in [the browser stack research](./browser-vision-stack-research.md).

The first milestone should prove two things: a useful subset of overlapping seals can be recognized on unfamiliar people, and one hand-attached effect plus one face-attached effect remains responsive on an iPhone, a midrange Android phone and a laptop. Start with a small technique set selected from the measured recognition results. Clones follow after segmentation is profiled.

If hand landmarks fail on interlocked fingers, test a small image classifier over a crop containing both hands, rather than merely increasing landmark thresholds. Track failed detections in the denominator. Test false casts during ordinary movement, deliberate sequences, low light and sustained use. Target 30 fps mobile preview and roughly 150–250 ms from a settled final sign to the first effect; these are proposed goals, not benchmark results.

The user previously requested a project-local verification skill after project setup. Create it once the runnable camera app exists, covering prerecorded camera fixtures for regressions plus real-camera/device checks for tracking quality and latency.
