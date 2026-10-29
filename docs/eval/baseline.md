# Baseline evaluation

Generated 2026-10-29 by `training/baseline.py` with 3 calibration samples per seal and the thresholds shipped in `src/runtime`.

Each of the 2 sessions calibrates the matcher in turn and every other session is replayed against it.

| Session | Person | Place | Lighting | Clips | Frames |
|---|---|---|---|---|---|
| session-2026-10-29-cyn-2 | cyn | desk | daylight | 13 | 1818 |
| session-2026-10-29-cyn | cyn | desk | daylight | 16 | 2416 |

## Tracking coverage

| Class | 0 hands | 1 hand | 2 hands |
|---|---|---|---|
| akimichi-seal | 0% | 100% | 0% |
| bird | 0% | 8% | 92% |
| boar | 0% | 28% | 72% |
| dog | 0% | 0% | 100% |
| dragon | 3% | 61% | 36% |
| hare | 0% | 0% | 100% |
| horse | 0% | 0% | 100% |
| monkey | 0% | 3% | 97% |
| ox | 0% | 39% | 61% |
| ram | 0% | 63% | 37% |
| rat | 0% | 80% | 20% |
| snake | 0% | 50% | 50% |
| tiger | 0% | 80% | 20% |
| none | 33% | 45% | 22% |

## landmarks

| Class | Frames | Precision | Recall | Most confused with | Calibrated |
|---|---|---|---|---|---|
| akimichi-seal | 8 | – | 0% | none (100%) | 0/2 |
| bird | 302 | 74% | 26% | none (74%) | 2/2 |
| boar | 301 | 100% | 15% | none (85%) | 2/2 |
| dog | 302 | 100% | 34% | none (66%) | 2/2 |
| dragon | 301 | 0% | 0% | none (99%) | 1/2 |
| hare | 302 | – | 0% | none (100%) | 2/2 |
| horse | 301 | 100% | 100% | – | 2/2 |
| monkey | 301 | 100% | 18% | none (82%) | 2/2 |
| ox | 302 | – | 0% | none (100%) | 2/2 |
| ram | 303 | 59% | 27% | none (66%) | 2/2 |
| rat | 452 | 75% | 2% | none (94%) | 2/2 |
| snake | 303 | 40% | 7% | none (90%) | 2/2 |
| tiger | 302 | 27% | 4% | none (78%) | 1/2 |
| none | 454 | 12% | 89% | snake (7%) | – |

Calibrated: calibration sessions that yielded the 3 samples a seal needs.

False triggers on `none` clips: 1 in 0.5 min (2.0 per minute).

Sequences completed: 0 of 0.

### Confusion matrix

Rows are the recorded label, columns the accepted prediction (`none` = rejected).

|  | akimichi-seal | bird | boar | dog | dragon | hare | horse | monkey | ox | ram | rat | snake | tiger | none |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| akimichi-seal |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |
| bird |  | 80 |  |  |  |  |  |  |  |  |  |  |  | 222 |
| boar |  |  | 45 |  |  |  |  |  |  |  |  |  |  | 256 |
| dog |  |  |  | 104 |  |  |  |  |  |  |  |  |  | 198 |
| dragon |  |  |  |  |  |  |  |  |  |  | 2 |  |  | 299 |
| hare |  |  |  |  |  |  |  |  |  |  |  |  |  | 302 |
| horse |  |  |  |  |  |  | 301 |  |  |  |  |  |  |  |
| monkey |  |  |  |  |  |  |  | 55 |  |  |  |  |  | 246 |
| ox |  |  |  |  |  |  |  |  |  |  | 1 |  |  | 301 |
| ram |  |  |  |  |  |  |  |  |  | 82 |  |  | 21 | 200 |
| rat |  | 17 |  |  |  |  |  |  |  |  | 9 |  |  | 426 |
| snake |  | 5 |  |  |  |  |  |  |  | 2 |  | 21 | 1 | 274 |
| tiger |  |  |  |  |  |  |  |  |  | 56 |  |  | 11 | 235 |
| none |  | 6 |  |  | 6 |  |  |  |  |  |  | 32 | 8 | 402 |

### Rejection reasons

| Class | match | ambiguous | no-match | hand-count | too-small | no-hands | uncalibrated |
|---|---|---|---|---|---|---|---|
| akimichi-seal | 0% | 0% | 100% | 0% | 0% | 0% | 0% |
| bird | 26% | 0% | 74% | 0% | 0% | 0% | 0% |
| boar | 15% | 0% | 85% | 0% | 0% | 0% | 0% |
| dog | 34% | 0% | 66% | 0% | 0% | 0% | 0% |
| dragon | 1% | 0% | 96% | 0% | 1% | 3% | 0% |
| hare | 0% | 0% | 100% | 0% | 0% | 0% | 0% |
| horse | 100% | 0% | 0% | 0% | 0% | 0% | 0% |
| monkey | 18% | 0% | 82% | 0% | 0% | 0% | 0% |
| ox | 0% | 0% | 99% | 0% | 0% | 0% | 0% |
| ram | 34% | 1% | 65% | 0% | 0% | 0% | 0% |
| rat | 6% | 0% | 94% | 0% | 0% | 0% | 0% |
| snake | 10% | 0% | 90% | 0% | 0% | 0% | 0% |
| tiger | 22% | 0% | 78% | 0% | 0% | 0% | 0% |
| none | 11% | 0% | 55% | 0% | 0% | 33% | 0% |

## image

| Class | Frames | Precision | Recall | Most confused with | Calibrated |
|---|---|---|---|---|---|
| akimichi-seal | 8 | – | 0% | none (100%) | 0/2 |
| bird | 302 | 0% | 0% | none (100%) | 2/2 |
| boar | 301 | – | 0% | none (100%) | 1/2 |
| dog | 302 | – | 0% | none (100%) | 2/2 |
| dragon | 301 | – | 0% | none (99%) | 1/2 |
| hare | 302 | – | 0% | none (98%) | 2/2 |
| horse | 301 | 0% | 0% | none (99%) | 2/2 |
| monkey | 301 | – | 0% | none (100%) | 2/2 |
| ox | 302 | 0% | 0% | none (97%) | 2/2 |
| ram | 303 | 0% | 0% | none (61%) | 2/2 |
| rat | 452 | 72% | 23% | none (77%) | 2/2 |
| snake | 303 | 100% | 3% | none (97%) | 1/2 |
| tiger | 302 | 0% | 0% | none (64%) | 1/2 |
| none | 454 | 11% | 97% | tiger (2%) | – |

Calibrated: calibration sessions that yielded the 3 samples a seal needs.

False triggers on `none` clips: 0 in 0.5 min (0.0 per minute).

Sequences completed: 0 of 0.

### Confusion matrix

Rows are the recorded label, columns the accepted prediction (`none` = rejected).

|  | akimichi-seal | bird | boar | dog | dragon | hare | horse | monkey | ox | ram | rat | snake | tiger | none |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| akimichi-seal |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |
| bird |  |  |  |  |  |  |  |  |  |  |  |  |  | 302 |
| boar |  |  |  |  |  |  |  |  |  |  |  |  |  | 301 |
| dog |  |  |  |  |  |  |  |  |  |  |  |  |  | 302 |
| dragon |  |  |  |  |  |  |  |  |  |  | 2 |  |  | 299 |
| hare |  | 3 |  |  |  |  | 4 |  |  |  |  |  |  | 295 |
| horse |  |  |  |  |  |  |  |  | 2 |  |  |  |  | 299 |
| monkey |  |  |  |  |  |  |  |  |  |  |  |  |  | 301 |
| ox |  |  |  |  |  |  | 8 |  |  |  | 2 |  |  | 292 |
| ram |  |  |  |  |  |  |  |  |  |  | 6 |  | 112 | 185 |
| rat |  |  |  |  |  |  |  |  | 4 |  | 102 |  |  | 346 |
| snake |  |  |  |  |  |  |  |  |  |  |  | 8 |  | 295 |
| tiger |  | 4 |  |  |  |  |  |  | 2 | 78 | 26 |  |  | 192 |
| none |  |  |  |  |  |  |  |  |  |  | 4 |  | 8 | 442 |

### Rejection reasons

| Class | match | ambiguous | no-match | hand-count | too-small | no-hands | uncalibrated |
|---|---|---|---|---|---|---|---|
| akimichi-seal | 0% | 0% | 100% | 0% | 0% | 0% | 0% |
| bird | 0% | 0% | 100% | 0% | 0% | 0% | 0% |
| boar | 0% | 0% | 100% | 0% | 0% | 0% | 0% |
| dog | 0% | 0% | 100% | 0% | 0% | 0% | 0% |
| dragon | 1% | 0% | 99% | 0% | 0% | 0% | 0% |
| hare | 2% | 0% | 98% | 0% | 0% | 0% | 0% |
| horse | 1% | 0% | 99% | 0% | 0% | 0% | 0% |
| monkey | 0% | 0% | 100% | 0% | 0% | 0% | 0% |
| ox | 3% | 0% | 97% | 0% | 0% | 0% | 0% |
| ram | 39% | 1% | 60% | 0% | 0% | 0% | 0% |
| rat | 23% | 3% | 73% | 0% | 0% | 0% | 0% |
| snake | 3% | 0% | 97% | 0% | 0% | 0% | 0% |
| tiger | 36% | 8% | 56% | 0% | 0% | 0% | 0% |
| none | 3% | 2% | 96% | 0% | 0% | 0% | 0% |

