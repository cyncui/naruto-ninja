"""Feature encoding, clip trimming and an end-to-end training run on synthetic sessions."""

import math

import numpy as np
import pytest

from dataset import CLASSES, SIZE, encode, samples, slots, vector
from load import NONE, read_session
from tests.test_baseline import session_text
from train import augment, decide, fit, probabilities, report, run, split, training_set


@pytest.fixture
def sessions():
    return [read_session(session_text(f"s{n}", n)) for n in (1, 2)]


def test_encoding_has_fixed_size_and_presence_flags(sessions):
    rows = samples(sessions[0])
    two = next(r for r in rows if len(r.frame.hands) == 2)
    none = next(r for r in rows if not r.frame.hands)
    for kind in "AB":
        assert vector(two.frame, kind).shape == (SIZE[kind],)
        assert list(vector(two.frame, kind)[84:86]) == [1, 1]
        assert not vector(none.frame, kind).any()


def test_feature_b_ignores_scale_and_rotation(sessions):
    hands = slots(next(r for r in samples(sessions[0]) if len(r.frame.hands) == 2).frame)
    c, s = math.cos(0.3) * 1.4, math.sin(0.3) * 1.4
    turned = [[(c * x - s * y, s * x + c * y) for x, y in hand] for hand in hands]
    a, b = encode(hands, "B"), encode(turned, "B")
    assert np.allclose(a[86:116], b[86:116], atol=1e-5)  # joint angles
    assert np.allclose(a[116:] * 1.4, b[116:], atol=1e-4)  # distances scale together


def test_seal_clips_drop_their_settling_frames(sessions):
    session = sessions[0]
    kept = samples(session, settle_ms=1500, skip={})
    for index, clip in enumerate(session.clips):
        frames = [r.frame for r in kept if r.clip == index]
        if clip.is_sequence:
            assert not frames
        elif clip.truth == NONE:
            assert len(frames) == len(clip.frames)
        else:
            assert frames and all(f.t - clip.start >= 1500 for f in frames)
    skipped = samples(session, settle_ms=0, skip={("s1", 0): 2000})
    assert all(r.frame.t - session.clips[0].start >= 2000 for r in skipped if r.clip == 0)


def test_augmented_copies_stay_with_their_rows(sessions):
    # One row per seal, so every source pose is distinct.
    rows = list({r.label: r for r in samples(sessions[0]) if r.label != NONE}.values())
    assert len(rows) == 3
    copies = augment(rows, "A", 2, np.random.default_rng(0))
    assert copies.shape == (6, SIZE["A"])
    originals = np.stack([vector(r.frame) for r in rows])
    # Each pair of copies is nearest to its own source row.
    for i, copy in enumerate(copies):
        assert np.argmin(np.linalg.norm(originals - copy, axis=1)) == i // 2


def test_training_labels_match_their_frames(sessions):
    rows = list({r.label: r for r in samples(sessions[0]) if r.label != NONE}.values())
    rows = rows * 2  # several rows per label, in an order that differs from the copies'
    x, y = training_set(rows, "A")
    assert len(x) == len(y) == 3 * len(rows)
    originals = np.stack([vector(r.frame) for r in rows])
    for features, label in zip(x, y):
        nearest = rows[np.argmin(np.linalg.norm(originals - features, axis=1))]
        assert CLASSES[label] == nearest.label


def test_split_is_by_time_within_each_clip(sessions):
    rows = samples(sessions[0])
    fit_rows, val_rows = split(rows)
    assert len(fit_rows) + len(val_rows) == len(rows)
    for clip in {r.clip for r in rows}:
        first_val = min((r.frame.t for r in val_rows if r.clip == clip), default=math.inf)
        assert all(r.frame.t < first_val for r in fit_rows if r.clip == clip)


def test_decide_rejects_low_confidence_and_none():
    probs = np.zeros((3, len(CLASSES)))
    probs[0, 0], probs[0, 1] = 0.9, 0.1  # confident rat
    probs[1, 0], probs[1, 1] = 0.55, 0.45  # rat, but no lead
    probs[2, CLASSES.index(NONE)] = 1.0
    assert decide(probs, 0.5, 0.2) == ["rat", NONE, NONE]


def test_model_learns_distinct_synthetic_seals(sessions):
    rows = [r for r in samples(sessions[0]) if r.label != NONE]
    model = fit(rows, "A")
    test_rows = [r for r in samples(sessions[1]) if r.label != NONE]
    said = decide(probabilities(model, test_rows, "A"), 0.5, 0.0)
    assert np.mean([s == r.label for s, r in zip(said, test_rows)]) > 0.9


def test_report_compares_model_with_baseline(sessions):
    scores, notes = run(sessions)
    assert set(scores) == {"landmarks", "image", "model A", "model B"}
    assert len(notes) == 4
    text = report(sessions)
    for heading in ("## Recall by seal", "## Precision by seal", "## Summary", "## Thresholds"):
        assert heading in text
