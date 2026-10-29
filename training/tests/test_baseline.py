"""End-to-end run of baseline.py on synthetic sessions."""

import json
import random

import pytest

from baseline import MATCHERS, evaluate, report
from load import NONE, read_session


def hand(x, y, rng, spread=0.25):
    # Wrist and middle knuckle fixed, so every hand has the same scale.
    return [
        {
            "x": x if i in (0, 9) else x + (rng.random() - 0.5) * spread,
            "y": y if i == 0 else y - spread / 2 if i == 9 else y + (rng.random() - 0.5) * spread,
            "z": 0,
        }
        for i in range(21)
    ]


def jitter(hands, rng, by):
    return [
        [{**p, "x": p["x"] + (rng.random() - 0.5) * by, "y": p["y"] + (rng.random() - 0.5) * by} for p in h]
        for h in hands
    ]


POSES = {}
_rng = random.Random(1)
for seal in ("tiger", "rat", "ox"):
    POSES[seal] = [hand(0.35, 0.5, _rng), hand(0.65, 0.5, _rng)]


def session_text(name, seed):
    rng = random.Random(seed)
    lines = [{"type": "session", "version": 1, "session": name, "person": "P1", "place": "desk", "lighting": "lamp"}]
    clips = [(seal, POSES[seal]) for seal in POSES] + [("none:rest", None), ("sequence:demo", None)]
    t = 0
    for clip_id, (label, pose) in enumerate(clips):
        frames = []
        for i in range(45):  # 3 s at 15 Hz
            t += 66
            if label == "none:rest":
                hands = [] if i % 3 else [hand(0.5, 0.8, rng)]
            elif label == "sequence:demo":
                seal = ("rat", "tiger")[i // 23]
                hands = jitter(POSES[seal], rng, 0.002)
            else:
                hands = jitter(pose, rng, 0.002)
            frames.append({"type": "frame", "clip": clip_id, "t": t, "hands": hands, "handedness": [], "aspect": 1.5})
        meta = {"type": "clip", "clip": clip_id, "label": label, "start": frames[0]["t"], "end": t, "frames": len(frames)}
        if label.startswith("sequence:"):
            meta["steps"] = ["rat", "tiger"]
        lines += [meta, *frames]
    return "\n".join(json.dumps(line) for line in lines) + "\n"


@pytest.fixture
def sessions():
    return [read_session(session_text(f"s{n}", n)) for n in (1, 2)]


def test_landmark_baseline_separates_distinct_seals(sessions):
    score = evaluate(sessions, MATCHERS[0], 3)
    assert score.pairs == 2
    for seal in POSES:
        assert score.calibrated[seal] == 2
        assert score.confusion[seal, seal] > 0
    assert score.confusion[NONE, NONE] == 90
    assert score.false_triggers == 0
    assert (score.sequences, score.completed) == (2, 2)


def test_report_has_every_section(sessions):
    text = report(sessions, 3)
    for heading in ("# Baseline evaluation", "## Tracking coverage", "## landmarks", "## image"):
        assert heading in text
    # No embeddings were recorded, so the image matcher rejects every frame.
    assert "| none | 90 |" in text


def test_single_session_is_flagged(sessions):
    assert "Only one session" in report(sessions[:1], 3)
