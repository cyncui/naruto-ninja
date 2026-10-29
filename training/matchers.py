"""Python ports of the app's matchers, stabilizer and sequence logic.

Each function mirrors one in src/runtime and is checked against the app's own
outputs in tests/fixtures/parity.json. Regenerate that file with
`npm run fixtures:training` whenever the TypeScript changes.
"""

from __future__ import annotations

import math
from typing import Callable

# src/runtime/recognition.ts
MATCH_LIMIT = 0.16
MATCH_MARGIN = 0.035
# src/runtime/embedding.ts
IMAGE_MATCH_LIMIT = 0.2
IMAGE_MATCH_MARGIN = 0.02
# src/runtime/teach.ts and the SteadyCapture thresholds in src/App.tsx
TEACH_SAMPLES = 3
TEACH_HOLD_MS = 900
LANDMARK_STEADY = 0.08
IMAGE_STEADY = 0.06

Templates = dict[str, list[list[float]]]
Vector = list[float]


def features(hands: list[list[dict]], aspect: float) -> Vector | None:
    """recognition.ts features(): hands sorted by wrist x, centred and scaled."""
    if not 1 <= len(hands) <= 2 or any(len(hand) != 21 for hand in hands):
        return None
    ordered = sorted(hands, key=lambda hand: hand[0]["x"])
    n = len(ordered)
    cx = sum(hand[0]["x"] for hand in ordered) / n
    cy = sum(hand[0]["y"] for hand in ordered) / n
    scale = (
        sum(
            math.hypot(
                (hand[9]["x"] - hand[0]["x"]) * aspect, hand[9]["y"] - hand[0]["y"]
            )
            for hand in ordered
        )
        / n
    )
    if scale < 0.025:
        return None
    return [
        value
        for hand in ordered
        for p in hand
        for value in (((p["x"] - cx) * aspect) / scale, (p["y"] - cy) / scale)
    ]


def rms(a: Vector, b: Vector) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)) / len(a))


def cosine_distance(a: Vector, b: Vector) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a)
    nb = sum(y * y for y in b)
    return 1 - dot / math.sqrt(na * nb) if na and nb else 1.0


def _decide(ranked: list[tuple[str, float]], limit: float, margin: float) -> dict:
    (best, distance), second = ranked[0], ranked[1] if len(ranked) > 1 else None
    result = {"best": best, "distance": distance}
    if distance > limit:
        return {"reason": "no-match", **result}
    if second and second[1] - distance < margin:
        return {"reason": "ambiguous", **result, "runnerUp": second[0]}
    return {"reason": "match", **result}


def diagnose(hands: list[list[dict]], aspect: float, templates: Templates) -> dict:
    """recognition.ts diagnose(): nearest calibrated seal or a rejection reason."""
    if not hands:
        return {"reason": "no-hands"}
    vector = features(hands, aspect)
    if vector is None:
        return {"reason": "too-small"}
    ranked = sorted(
        (
            (seal, min(rms(sample, vector) for sample in same))
            for seal, samples in templates.items()
            if len(samples) >= 3
            and (same := [s for s in samples if len(s) == len(vector)])
        ),
        key=lambda pair: pair[1],
    )
    if not ranked:
        calibrated = any(len(samples) >= 3 for samples in templates.values())
        return (
            {"reason": "hand-count", "hands": len(hands)}
            if calibrated
            else {"reason": "uncalibrated"}
        )
    return _decide(ranked, MATCH_LIMIT, MATCH_MARGIN)


def diagnose_embedding(embedding: Vector | None, templates: Templates) -> dict:
    """embedding.ts diagnoseEmbedding()."""
    if not embedding:
        return {"reason": "no-hands"}
    ranked = sorted(
        (
            (seal, min(cosine_distance(s, embedding) for s in same))
            for seal, samples in templates.items()
            if len(samples) >= 3
            and (same := [s for s in samples if len(s) == len(embedding)])
        ),
        key=lambda pair: pair[1],
    )
    if not ranked:
        return {"reason": "uncalibrated"}
    return _decide(ranked, IMAGE_MATCH_LIMIT, IMAGE_MATCH_MARGIN)


class StableSeal:
    """sequence.ts StableSeal: emit a seal held for 350 ms, once until released."""

    def __init__(self) -> None:
        self.candidate: str | None = None
        self.since = 0.0
        self.emitted: str | None = None
        self.released_at: float | None = None

    def update(self, label: str | None, now: float) -> str | None:
        if label is None:
            if self.released_at is None:
                self.released_at = now
            if now - self.released_at >= 180:
                self.emitted = None
            self.candidate = None
            return None
        self.released_at = None
        if self.candidate != label:
            self.candidate = label
            self.since = now
        if now - self.since >= 350 and self.emitted != label:
            self.emitted = label
            return label
        return None


def advance_sequence(steps: list[str], progress: int, seal: str) -> dict:
    """sequence.ts advanceSequence()."""
    if not steps:
        return {"progress": 0, "complete": False, "correct": False}
    if progress < len(steps) and steps[progress] == seal:
        following = progress + 1
    elif steps[0] == seal:
        following = 1
    else:
        following = 0
    return {
        "progress": following,
        "complete": following == len(steps),
        "correct": progress < len(steps) and steps[progress] == seal,
    }


class SteadyCapture:
    """teach.ts SteadyCapture: a sample each time a pose is held for 900 ms."""

    def __init__(self, steady: float, distance: Callable[[Vector, Vector], float]):
        self.steady = steady
        self.distance = distance
        self.previous: Vector | None = None
        self.since = 0.0

    def update(self, vector: Vector | None, now: float) -> tuple[float, Vector | None]:
        previous, self.previous = self.previous, vector
        if (
            not vector
            or not previous
            or len(previous) != len(vector)
            or self.distance(previous, vector) > self.steady
        ):
            self.since = now
            return 0.0, None
        held = now - self.since
        if held < TEACH_HOLD_MS:
            return held / TEACH_HOLD_MS, None
        self.since = now
        return 1.0, vector
