# Seal arena

The arena replaces the sequence window with a study library of the twelve seals and a timed ten-seal recognition drill that keeps a best round on the device.

## Sub-features

- `arena-enter` switches to Arena mode, showing region `Seal arena` and hiding the floating sequence window.
- `arena-library` shows any seal's 3D hand model and how-to text, picked from a tile or a ring marker.
- `arena-drill` runs ten prompts, scores each tap, and ends with a round summary.
- `arena-best` stores the best round under `naruto-ninja.arena-best.v1` and shows it in the HUD.
- `arena-camera` checks the shown seal against live hands and lets a recognized seal answer the drill.

## How to get to it (user POV)

- Choose `Arena` in the input-mode switch (bottom dock on desktop, header on phones).
- In the library, choose a seal tile or a ring marker named `Show <seal>`.
- Choose the `Drill` tab, then `Begin sync test`; answer with a tile or a ring marker named `Ring answer: <seal>`.

## Driving it with Playwright

Preconditions:

- The production build is current (`npm run build`) and nothing listens on port 4173.
- A fresh browser context, so `naruto-ninja.arena-best.v1` starts empty.

- **Run the case.** Run `npm run test:e2e -- --grep "arena library" --trace on`. Exit code `0` and `1 passed`.
- **Enter the arena.** The case clicks the last button named `Arena` (exact) and expects region `Seal arena` visible and region `Movable hand sequence` hidden.
- **Study a seal.** It clicks the tile button `Tiger` (exact), then ring marker `Show Dog`. `.arena-howto` reads `How to: Tiger`, then `How to: Dog`.
- **Run a round.** It chooses tab `Drill` and `Begin sync test`, then for ten prompts waits for status `Which seal is shown` and clicks `Answer: Rat`. The status ends with `<n>/10 in <t> s`.
- **Proof of the side effect.** It reads `naruto-ninja.arena-best.v1` from storage and requires `total` to be `10`, and `Run it again` to be visible. The trace holds each click and the status text after it.

## Gotchas

- Two buttons are named `Arena`: the phone header switch and the desktop dock. Desktop runs use the last one.
- Prompts are random with no seal twice in a row, so always answering `Rat` scores 0 to 5. Assert the round finishes and stores a best, never a specific score.
- Each answer holds feedback for 450 ms (right) or 1100 ms (missed) before the next prompt, so a round takes 5 to 11 seconds.
- `arena-camera` is not covered: the synthetic camera shows no hands, so live corrections and camera answers need a person in front of a real camera.
- The case emulates reduced motion so the ring and hand model hold still while it clicks markers.
