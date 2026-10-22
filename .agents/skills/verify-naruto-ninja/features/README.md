# Browser feature map

- [Practice and effects](practice.md): ordered seals, ring markers, errors, previews and reset.
- [Floating camera layout](layout.md): drag, resize, keyboard, persistence and phone layouts.
- [Technique catalogue](catalogue.md): search, unresolved powers, repeated seals, long sequences and variants.
- [Camera lifecycle](camera.md): permissions, model loading and track cleanup.
- [Personal calibration](calibration.md): capture countdown, stored vectors, cancellation and the image matcher.
- [Field guide and routing](routing.md): accessible help, route transitions, seal progress and real 404 recovery.
- [Seal arena](arena.md): seal library, timed recognition drill and best round.
- [Session recording](record.md): labelled clips under `?record` and the JSONL export.

`tests/browser/app.spec.ts` has fifteen cases, and each grep above belongs to one of these files. Run all fifteen for changes that cross these boundaries. The cases use isolated contexts and a managed server on port 4173. No login or seed account is needed.
