# Practice and effects

## Sub-features

Ordered manual seals; seal-ring markers; wrong-order feedback; sequence completion; preview and reset.

## How to get to it (user POV)

Start in Demo. Great Fireball is selected. Click the numbered seals in the sequence window, or the markers on the seal ring around the practice figure. Preview effect is in the bottom dock.

## Driving it with Playwright

Run `npm run test:e2e -- --grep "manual practice" --trace on`. The test clicks `Practice step 2: Ram` first and checks Out of order. Then it clicks Snake, Ram, Monkey, Boar, Horse and Tiger, checks `data-effect="fire"` and sequence complete, then clicks `↺ Reset` and checks `none`. It captures before/after screenshots and asserts no vision/model requests.

For the ring, run `npm run test:e2e -- --grep "demo ring" --trace on`. It clicks `Seal ring step 1: Snake` and `Seal ring step 2: Ram`, checks `.training-seal` has `data-progress="2"`, then clicks `Seal ring step 4: Boar` and checks the status reads Out of order.

## Gotchas

These manual controls verify sequence logic, not recognition. Preview must never satisfy a sequence. The current step can scroll into view inside the panel. Hands-free teaching during camera practice has no browser case: the synthetic camera shows no hands, so it needs a person.
