# Technique catalogue

## Sub-features

Search; collection selection; unresolved activation; repeated adjacent signs; Escape dismissal and focus return.

## How to get to it (user POV)

Click Techniques in the bottom dock. Search by technique, clan or nature, then choose a result. Open sequence source details inside the floating panel.

## Driving it with Playwright

Run `npm run test:e2e -- --grep "catalogue search|long techniques" --trace on`. Fill the searchbox with sharingan, choose the Sharingan button within the dialog and check unresolved text. Preview has effect `eyes`. Byakugan previews `pale-eyes`. Uzumaki Sealing has seven steps including separate `Practice step 3: Dog` and `Practice step 4: Dog`. An unmatched search shows No matching techniques. Escape closes the dialog and restores focus to Techniques.

## Gotchas

Unresolved records intentionally have no invented sequence. A preview is illustrative. Search inputs can consume native Escape, so the explicit dialog dismissal behavior is covered.

For techniques with multiple reported variants, open Source & notes to use the labeled Sequence picker. The long-technique browser case checks that a 44-step sequence keeps feedback visible, then selects the unresolved alternative.
