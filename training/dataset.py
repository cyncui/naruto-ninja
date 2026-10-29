"""Labelled frames and fixed-size feature vectors for the seal classifier.

Two feature sets (docs/trained-classifier-plan.md, Milestone 3):
  A: two hand slots sorted by wrist x, each 21 points × (x, y) normalised as
     features() does, plus a presence flag per slot. Missing hands are zeros.
  B: A plus, per slot, the 15 finger joint angles, and the 25 fingertip
     distances between the two hands. All scale-invariant.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from load import NONE, Frame, Session
from matchers import features

# The 12 base seals, in the app's order (src/seal-guide.ts).
SEALS = ["rat", "ox", "tiger", "hare", "dragon", "snake", "horse", "ram", "monkey", "bird", "dog", "boar"]
CLASSES = SEALS + [NONE]
# Moving into the pose at the start of a seal clip is not the seal yet.
SETTLE_MS = 1500
EXCLUSIONS = Path(__file__).parent / "exclusions.json"

FINGERS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20]]
TIPS = [4, 8, 12, 16, 20]
SIZE = {"A": 86, "B": 86 + 30 + 25}


@dataclass
class Sample:
    session: str
    clip: int
    label: str
    frame: Frame


def exclusions(path: Path = EXCLUSIONS) -> dict[tuple[str, int], int]:
    """(session id, clip index) → milliseconds into the clip before which frames are dropped."""
    if not path.exists():
        return {}
    return {(row["session"], row["clip"]): row["before_ms"] for row in json.loads(path.read_text())}


def samples(session: Session, settle_ms: int = SETTLE_MS, skip: dict | None = None) -> list[Sample]:
    """Frames from seal and `none:*` clips, with each seal clip's first `settle_ms` dropped.

    Sequence clips and labels outside the 12 base seals are left out.
    """
    skip = exclusions() if skip is None else skip
    out = []
    for index, clip in enumerate(session.clips):
        if clip.is_sequence or clip.truth not in CLASSES:
            continue
        before = skip.get((session.info.get("session"), index), 0)
        if clip.truth != NONE:
            before = max(before, settle_ms)
        out += [
            Sample(session.name, index, clip.truth, frame)
            for frame in clip.frames
            if frame.t - clip.start >= before
        ]
    return out


def _angles(points: list[tuple[float, float]]) -> list[float]:
    """Signed bend at the three inner joints of each finger, in radians."""
    out = []
    for chain in FINGERS:
        for a, b, c in zip(chain, chain[1:], chain[2:]):
            u = (points[b][0] - points[a][0], points[b][1] - points[a][1])
            v = (points[c][0] - points[b][0], points[c][1] - points[b][1])
            out.append(math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]))
    return out


Slots = list[list[tuple[float, float]]]


def slots(frame: Frame) -> Slots:
    """Normalised (x, y) points per tracked hand, left to right; empty without usable hands."""
    flat = features(frame.hands, frame.aspect)
    if flat is None:
        return []
    return [[(flat[i + 2 * j], flat[i + 2 * j + 1]) for j in range(21)] for i in range(0, len(flat), 42)]


def encode(hands: Slots, kind: str = "A") -> np.ndarray:
    """Fixed-size input from `slots()`. All zeros when there are no hands."""
    out = np.zeros(SIZE[kind], dtype=np.float32)
    for n, points in enumerate(hands):
        out[n * 42 : n * 42 + 42] = [v for p in points for v in p]
        out[84 + n] = 1
    if kind == "A":
        return out
    for n, points in enumerate(hands):
        out[86 + n * 15 : 86 + n * 15 + 15] = _angles(points)
    if len(hands) == 2:
        left, right = hands
        out[116:] = [math.dist(left[a], right[b]) for a in TIPS for b in TIPS]
    return out


def vector(frame: Frame, kind: str = "A") -> np.ndarray:
    return encode(slots(frame), kind)


def matrix(rows: list[Sample], kind: str = "A") -> tuple[np.ndarray, np.ndarray]:
    x = np.stack([vector(s.frame, kind) for s in rows]) if rows else np.zeros((0, SIZE[kind]))
    y = np.array([CLASSES.index(s.label) for s in rows], dtype=np.int64)
    return x, y
