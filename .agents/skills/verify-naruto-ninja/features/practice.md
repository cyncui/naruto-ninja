# Practice and effects

## Sub-features

Ordered manual seals; wrong-order feedback; sequence completion; preview and reset.

## How to get to it (user POV)

Start in Demo. Great Fireball is selected. Click the numbered seals in the sequence window. Preview effect is in the bottom dock.

## Driving it with Playwright

Run `npm run test:e2e -- --grep "manual practice" --trace on`. The test clicks `Practice step 2: Ram` first and checks Out of order. Then it clicks Snake, Ram, Monkey, Boar, Horse and Tiger, checks `data-effect="fire"` and sequence complete, then clicks `↺ Reset` and checks `none`. It captures before/after screenshots and asserts no vision/model requests.

## Gotchas

These manual controls verify sequence logic, not recognition. Preview must never satisfy a sequence. The current step can scroll into view inside the panel.
