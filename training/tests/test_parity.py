"""The Python ports must reproduce the app's outputs in fixtures/parity.json."""

import json
from pathlib import Path

import pytest

from load import read_session
from matchers import (
    LANDMARK_STEADY,
    StableSeal,
    SteadyCapture,
    advance_sequence,
    cosine_distance,
    diagnose,
    diagnose_embedding,
    features,
    rms,
)

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "parity.json").read_text())


def same_diagnosis(actual: dict, expected: dict):
    assert actual.keys() == expected.keys()
    for key, value in expected.items():
        if key == "distance":
            assert actual[key] == pytest.approx(value, abs=1e-12)
        else:
            assert actual[key] == value


@pytest.mark.parametrize("case", FIXTURE["features"])
def test_features(case):
    actual = features(case["hands"], case["aspect"])
    if case["expected"] is None:
        assert actual is None
    else:
        assert actual == pytest.approx(case["expected"], abs=1e-12)


@pytest.mark.parametrize("case", FIXTURE["diagnose"]["cases"])
def test_diagnose(case):
    templates = FIXTURE["diagnose"]["templates"]
    same_diagnosis(diagnose(case["hands"], case["aspect"], templates), case["expected"])


@pytest.mark.parametrize("case", FIXTURE["embedding"]["cases"])
def test_diagnose_embedding(case):
    templates = FIXTURE["embedding"]["templates"]
    same_diagnosis(diagnose_embedding(case["embedding"], templates), case["expected"])


def test_cosine_distance():
    c = FIXTURE["embedding"]["cosine"]
    assert cosine_distance(c["a"], c["b"]) == pytest.approx(c["expected"], abs=1e-12)


def test_every_reason_is_covered():
    reasons = {c["expected"]["reason"] for c in FIXTURE["diagnose"]["cases"]}
    assert {"match", "ambiguous", "no-match", "hand-count", "too-small", "no-hands"} <= reasons


def test_stable_seal():
    stable = StableSeal()
    actual = [stable.update(label, t) for label, t in FIXTURE["stable"]["input"]]
    assert actual == FIXTURE["stable"]["expected"]


@pytest.mark.parametrize("case", FIXTURE["sequence"]["cases"])
def test_advance_sequence(case):
    steps = FIXTURE["sequence"]["steps"]
    assert advance_sequence(steps, case["progress"], case["seal"]) == case["expected"]


def test_steady_capture():
    steady = FIXTURE["steady"]
    assert steady["steady"] == LANDMARK_STEADY
    capture = SteadyCapture(LANDMARK_STEADY, rms)
    actual = []
    for row in steady["input"]:
        hold, sample = capture.update(row["vector"], row["t"])
        actual.append({"hold": pytest.approx(hold, abs=1e-12), "sampled": sample is not None})
    assert actual == steady["expected"]
    assert any(row["sampled"] for row in steady["expected"])


def test_reads_recorder_output():
    session = read_session(FIXTURE["session"])
    assert session.info["session"] == "fx01"
    tiger, sequence = session.clips
    assert (tiger.label, tiger.truth, len(tiger.frames)) == ("tiger", "tiger", 3)
    first, second, third = tiger.frames
    assert first.embedding is None
    # Stored once on the frame it arrived with, then carried forward.
    assert second.embedding is not None and third.embedding == second.embedding
    assert third.hands == []
    assert sequence.is_sequence and sequence.steps == ["rat", "tiger"]
