# Seal model evaluation

Generated 2026-10-29 by `training/train.py`. Each of the 2 sessions is held out in turn; the model trains on the others and the shipped matchers calibrate on them (3 samples per seal). The first 1.5 s of each seal clip and the ranges in `training/exclusions.json` are left out.

MLP 64 → 32 → 13 (12 seals + `none`). Feature set A: normalised landmarks of two hand slots plus presence flags. B: A plus finger joint angles and fingertip distances between hands.

## Recall by seal

Share of each label's held-out frames recognised correctly. For `none`, the share correctly rejected.

| Class | landmarks | image | model A | model B |
|---|---|---|---|---|
| rat | 2% | 23% | 59% | 57% |
| ox | 0% | 0% | 47% | 10% |
| tiger | 3% | 0% | 18% | 16% |
| hare | 0% | 0% | 3% | 50% |
| dragon | 0% | 0% | 39% | 40% |
| snake | 8% | 3% | 34% | 52% |
| horse | 100% | 0% | 100% | 100% |
| ram | 32% | 0% | 62% | 65% |
| monkey | 21% | 0% | 95% | 100% |
| bird | 31% | 0% | 49% | 77% |
| dog | 41% | 0% | 95% | 89% |
| boar | 15% | 0% | 51% | 72% |
| none | 89% | 97% | 59% | 54% |

## Precision by seal

Of the frames given this label, the share that were right.

| Class | landmarks | image | model A | model B |
|---|---|---|---|---|
| rat | 75% | 70% | 74% | 78% |
| ox | – | 0% | 95% | 78% |
| tiger | 21% | 0% | 25% | 22% |
| hare | – | – | 100% | 100% |
| dragon | 0% | – | 49% | 47% |
| snake | 40% | 100% | 66% | 73% |
| horse | 100% | 0% | 95% | 100% |
| ram | 67% | 0% | 74% | 59% |
| monkey | 100% | – | 100% | 100% |
| bird | 74% | 0% | 74% | 53% |
| dog | 100% | – | 100% | 99% |
| boar | 100% | – | 94% | 75% |

## Summary

|  | landmarks | image | model A | model B |
|---|---|---|---|---|
| Seal frames recognised | 21% | 3% | 55% | 61% |
| False triggers per minute on `none` | 2.0 | 0.0 | 12.0 | 12.0 |

## Thresholds

- Held out `session-2026-10-29-cyn-2`, model A: p = 0.98, m = 0.0 (targets not met; highest validation precision 73%).
- Held out `session-2026-10-29-cyn-2`, model B: p = 0.95, m = 0.0 (targets not met; highest validation precision 79%).
- Held out `session-2026-10-29-cyn`, model A: p = 0.98, m = 0.0 (met the validation targets); no `none` frames in training, so it cannot learn that class.
- Held out `session-2026-10-29-cyn`, model B: p = 0.98, m = 0.0 (targets not met; highest validation precision 87%); no `none` frames in training, so it cannot learn that class.

