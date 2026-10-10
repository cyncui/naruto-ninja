# Hand-sign catalogue

Research snapshot: October 9, 2026. `naruto-catalogue.json` is the canonical development dataset. Edit it directly; the report is generated. The catalogue contains all twelve base zodiac labels plus selected special seals, pose variants and physical actions. Coverage is bounded, not an exhaustive inventory of the entire franchise.

## Files

| File | Purpose |
|---|---|
| [naruto-catalogue.json](./naruto-catalogue.json) | Signs, techniques, ordered variants and source records |
| [naruto-catalogue.schema.json](./naruto-catalogue.schema.json) | Strict JSON Schema, draft 2020-12 |
| [catalogue.types.ts](./catalogue.types.ts) | TypeScript data contract |
| [catalogue.ts](./catalogue.ts) | Typed import and explicit selection of sequence candidates |
| [catalogue-report.json](./catalogue-report.json) | Counts, shared sequences, prefix conflicts and unresolved records |
| [Coverage notes](../research/coverage-notes.md) | Research scope and cross-check findings |
| [Verification backlog](../research/verification-backlog.md) | Missing source scenes and training references |

## Evidence and readiness

This snapshot has 33 gesture records: 12 basic seals, 13 special seals, five variants and three actions. It contains 81 technique/ability entries, 95 activation variants and 85 distinct source URLs. Twelve clans are explicitly associated with entries; other records are associated with characters, a village or shared skills. Associations are not exclusivity claims.

Of the 95 variants, 85 are `secondary_reported` and ten are `unresolved`. **Zero sequences are primary-verified.** Four official pages support broad abilities, clan associations or the twelve-sign system. Exact sequences mostly come from indexed reference fields: direct reference-page retrieval was restricted, and original panels/footage were not inspected. The source registry records this as `search_excerpt`. An official article about a power does not verify a sequence merely by sharing a citation list.

This provides symbolic data for UI, tutorials under development and sequence-matcher work. Every gesture is `untrained` and its geometry is `reference_required`: there are no model weights, pose coordinates, verified reference images or measured recognition accuracies in this package. Prose descriptions are research leads, not sufficient training specifications. `effectSuggestion` contains original app ideas.

## Import

In a TypeScript/Vite app, adjust the relative import to this directory:

```ts
import { catalogue, getSequenceCandidates } from './docs/data/catalogue';

const fireball = catalogue.techniques.find(t => t.id === 'fire-great-fireball');
const candidateVariants = getSequenceCandidates({ includeSecondaryReports: true });
```

The helper excludes unresolved and no-seal entries. With its default settings it returns only primary-verified sequences, so it returns an empty list for this snapshot. Explicitly enabling secondary reports supports prototyping while keeping their evidence status attached. The typed import relies on the schema validation in `npm run check`; it does not add Ajv or any other runtime dependency to the camera app.

For clan navigation, filter `technique.associations` by `kind === 'clan'` and the stable ID, for example `nara`. Character IDs are separate: being used by Naruto does not automatically make a technique an Uzumaki clan ability.

## Semantics the matcher must preserve

- `steps` is an ordered array of canonical sign IDs. Repeated signs are intentional; Uzumaki Sealing includes adjacent Dog signs. Do not apply `Set` or collapse adjacent duplicates.
- `steps: null` means the activation is unresolved. It must never become a wildcard or empty sequence.
- `steps: []` is reserved for an explicit source report of no seals. It requires a separately designed app interaction; it never means cast immediately.
- `special_gesture` can be a symbolic named pose whose exact geometry is not yet known.
- `clap-hands` may mean a held palms-together posture. Source notes distinguish that from a transient clap. `slam-surface` and `finger-gun` are actions, not zodiac seals.
- `medium: 'unspecified'` preserves uncertainty where an infobox mixes media. A technique's manga debut is not proof of the provenance of a listed sequence.
- `sourceLocator` can describe a secondary field or a reported chapter/episode. Check `verificationStatus` before treating it as a directly inspected scene.
- Aliases normalize names, such as Rabbit to `hare`, Serpent to `snake`, and Jin to `yang-water`. They do not imply that every mirrored or one-handed pose is equivalent.
- `unknown`, `transition` and `tracking_lost` are rejection labels, never sign IDs or casting steps.

There are five exact shared-sequence groups and 40 prefix relationships in this snapshot. For example, Tiger alone corresponds to multiple techniques, and the clone seal is shared by several clone-related jutsu. A camera cannot identify intention from an identical pose. Start with a selected technique or character loadout; free casting needs a deliberate disambiguation/completion rule. The report retains each technique and variant instead of overwriting a sequence-to-technique map.

## Validation

From the repository root:

```sh
npm ci
npm run check
```

After changing the JSON:

```sh
npm run report:catalogue
npm run check
```

The validator checks JSON structure, stable IDs, unique entries, source references, all step references, the twelve basic labels, null/empty semantics and the prerequisites for a primary-verification claim. A regular check also rejects a missing or stale generated report. TypeScript checks the data contract and import helper. The report identifies collisions; they are research findings, not validation errors.

For primary verification, inspect the complete original sequence, add a directly accessed official source and precise locator, then change that variant's status. Do not promote every variant of a technique because one scene was verified. If geometry is later captured, evolve the schema explicitly; do not place unsupported landmark numbers into a description field.
