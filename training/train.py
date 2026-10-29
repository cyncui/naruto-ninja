"""Milestone 3: train the seal MLP and compare it with the shipped matchers.

Each session is held out in turn. The model trains on every other session:
the first 70% of each clip fits the network, the last 30% picks the
rejection thresholds `p` (top probability) and `m` (lead over the
runner-up), then the network is refit on all of it. The baseline matchers
calibrate on each training session the way hands-free teaching does. Both
are scored on the same held-out frames, and the report goes to
docs/eval/model.md.

    uv run train.py [recordings] [--out ../docs/eval/model.md]
"""

from __future__ import annotations

import argparse
import datetime
import math
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from baseline import MATCHERS, calibrate, pct, predicted, table
from dataset import CLASSES, SEALS, SETTLE_MS, Sample, encode, samples, slots
from load import NONE, Session, load
from matchers import StableSeal

ROOT = Path(__file__).resolve().parent.parent
KINDS = ["A", "B"]
FIT_SHARE = 0.7
# Validation targets for choosing p and m: accepted seals must be right this
# often, and `none` frames may be accepted as a seal at most this often.
TARGET_PRECISION = 0.95
TARGET_NONE_ACCEPT = 0.05
P_GRID = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98]
M_GRID = [0.0, 0.1, 0.2, 0.3, 0.5, 0.7]


def augment(rows: list[Sample], kind: str, copies: int, rng: np.random.Generator) -> np.ndarray:
    """Small rotations, scale changes and jitter of the normalised points."""
    out = []
    for row in rows:
        hands = slots(row.frame)
        for _ in range(copies):
            angle = rng.uniform(-0.17, 0.17)
            scale = rng.uniform(0.9, 1.1)
            c, s = math.cos(angle) * scale, math.sin(angle) * scale
            out.append(
                encode(
                    [
                        [(c * x - s * y + rng.normal(0, 0.02), s * x + c * y + rng.normal(0, 0.02)) for x, y in hand]
                        for hand in hands
                    ],
                    kind,
                )
            )
    return np.stack(out)


def training_set(rows: list[Sample], kind: str, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    """Each row once as recorded, then two augmented copies, with matching labels."""
    rng = np.random.default_rng(seed)
    x = np.concatenate([np.stack([encode(slots(r.frame), kind) for r in rows]), augment(rows, kind, 2, rng)])
    labels = np.array([CLASSES.index(r.label) for r in rows])
    # augment() emits each row's copies together, so repeat labels row by row.
    return x, np.concatenate([labels, np.repeat(labels, 2)])


def fit(rows: list[Sample], kind: str, seed: int = 0):
    x, y = training_set(rows, kind, seed)
    model = make_pipeline(
        StandardScaler(),
        MLPClassifier(hidden_layer_sizes=(64, 32), alpha=1e-3, max_iter=1500, random_state=seed),
    )
    model.fit(x, y)
    return model


def probabilities(model, rows: list[Sample], kind: str) -> np.ndarray:
    """Probability per entry of CLASSES, zero for classes absent from training."""
    out = np.zeros((len(rows), len(CLASSES)))
    if rows:
        x = np.stack([encode(slots(r.frame), kind) for r in rows])
        out[:, model.classes_] = model.predict_proba(x)
    return out


def decide(probs: np.ndarray, p: float, m: float) -> list[str]:
    ranked = np.sort(probs, axis=1)
    top = probs.argmax(axis=1)
    return [
        CLASSES[c] if CLASSES[c] != NONE and best >= p and best - second >= m else NONE
        for c, best, second in zip(top, ranked[:, -1], ranked[:, -2])
    ]


def choose(probs: np.ndarray, truth: list[str]) -> tuple[float, float, str]:
    """The (p, m) that recognise the most seal frames within the validation targets."""
    seal_frames = sum(t != NONE for t in truth) or 1
    none_frames = sum(t == NONE for t in truth)
    best, fallback = None, None
    for p in P_GRID:
        for m in M_GRID:
            said = decide(probs, p, m)
            accepted = [(s, t) for s, t in zip(said, truth) if s != NONE]
            right = sum(s == t for s, t in accepted)
            precision = right / len(accepted) if accepted else 1.0
            none_accept = sum(t == NONE for _, t in accepted) / none_frames if none_frames else 0.0
            recall = right / seal_frames
            if fallback is None or precision > fallback[0]:
                fallback = (precision, p, m)
            if precision >= TARGET_PRECISION and none_accept <= TARGET_NONE_ACCEPT and (best is None or recall > best[0]):
                best = (recall, p, m)
    if best:
        return best[1], best[2], "met the validation targets"
    return fallback[1], fallback[2], f"targets not met; highest validation precision {fallback[0]:.0%}"


def split(rows: list[Sample]) -> tuple[list[Sample], list[Sample]]:
    """First FIT_SHARE of each clip's frames to fit, the rest to validate."""
    by_clip: dict[tuple[str, int], list[Sample]] = {}
    for row in rows:
        by_clip.setdefault((row.session, row.clip), []).append(row)
    fit_rows, val_rows = [], []
    for clip in by_clip.values():
        cut = int(len(clip) * FIT_SHARE)
        fit_rows += clip[:cut]
        val_rows += clip[cut:]
    return fit_rows, val_rows


@dataclass
class Score:
    confusion: Counter = field(default_factory=Counter)
    none_ms: float = 0
    false_triggers: int = 0

    def add(self, rows: list[Sample], said: list[str]):
        """Frame counts, plus StableSeal replays over each `none` clip."""
        clips: dict[tuple[str, int], list[tuple[Sample, str]]] = {}
        for row, label in zip(rows, said):
            self.confusion[row.label, label] += 1
            clips.setdefault((row.session, row.clip), []).append((row, label))
        for clip in clips.values():
            if clip[0][0].label != NONE:
                continue
            stable = StableSeal()
            self.false_triggers += sum(
                bool(stable.update(None if label == NONE else label, row.frame.t)) for row, label in clip
            )
            self.none_ms += clip[-1][0].frame.t - clip[0][0].frame.t

    def recall(self, label: str) -> str:
        frames = sum(n for (t, _), n in self.confusion.items() if t == label)
        return pct(self.confusion[label, label], frames)

    def precision(self, label: str) -> str:
        said = sum(n for (_, p), n in self.confusion.items() if p == label)
        return pct(self.confusion[label, label], said)

    def triggers(self) -> str:
        minutes = self.none_ms / 60000
        return f"{self.false_triggers / minutes:.1f}" if minutes else "–"


def run(sessions: list[Session], settle_ms: int = SETTLE_MS):
    """Held-out scores per method, and notes on each fold."""
    scores = {name: Score() for name in [*(m.name for m in MATCHERS), *(f"model {k}" for k in KINDS)]}
    notes = []
    rows = {s.name: samples(s, settle_ms) for s in sessions}
    for test in sessions:
        train_sessions = [s for s in sessions if s is not test]
        test_rows = rows[test.name]
        train_rows = [r for s in train_sessions for r in rows[s.name]]
        if not train_rows or not test_rows:
            continue
        for matcher in MATCHERS:
            for calibration in train_sessions:
                templates = calibrate(calibration, matcher, 3)
                scores[matcher.name].add(test_rows, [predicted(matcher.diagnose(r.frame, templates)) for r in test_rows])
        has_none = any(r.label == NONE for r in train_rows)
        for kind in KINDS:
            fit_rows, val_rows = split(train_rows)
            probe = fit(fit_rows, kind)
            p, m, how = choose(probabilities(probe, val_rows, kind), [r.label for r in val_rows])
            model = fit(train_rows, kind)
            scores[f"model {kind}"].add(test_rows, decide(probabilities(model, test_rows, kind), p, m))
            notes.append(
                f"Held out `{test.name}`, model {kind}: p = {p}, m = {m} ({how})"
                + ("" if has_none else "; no `none` frames in training, so it cannot learn that class")
                + "."
            )
    return scores, notes


def report(sessions: list[Session], settle_ms: int = SETTLE_MS) -> str:
    scores, notes = run(sessions, settle_ms)
    names = list(scores)
    lines = [
        "# Seal model evaluation",
        "",
        f"Generated {datetime.date.today().isoformat()} by `training/train.py`. Each of the "
        f"{len(sessions)} sessions is held out in turn; the model trains on the others and the shipped "
        "matchers calibrate on them (3 samples per seal). The first "
        f"{settle_ms / 1000:g} s of each seal clip and the ranges in `training/exclusions.json` are left out.",
        "",
        "MLP 64 → 32 → 13 (12 seals + `none`). Feature set A: normalised landmarks of two hand slots plus "
        "presence flags. B: A plus finger joint angles and fingertip distances between hands.",
        "",
        "## Recall by seal",
        "",
        "Share of each label's held-out frames recognised correctly. For `none`, the share correctly rejected.",
        "",
    ]
    lines += table(["Class", *names], [[label, *(scores[n].recall(label) for n in names)] for label in CLASSES])
    lines += ["", "## Precision by seal", "", "Of the frames given this label, the share that were right.", ""]
    lines += table(["Class", *names], [[label, *(scores[n].precision(label) for n in names)] for label in SEALS])
    seal_recall = {
        n: pct(
            sum(scores[n].confusion[s, s] for s in SEALS),
            sum(c for (t, _), c in scores[n].confusion.items() if t != NONE),
        )
        for n in names
    }
    lines += [
        "",
        "## Summary",
        "",
        *table(
            ["", *names],
            [
                ["Seal frames recognised", *(seal_recall[n] for n in names)],
                ["False triggers per minute on `none`", *(scores[n].triggers() for n in names)],
            ],
        ),
        "",
        "## Thresholds",
        "",
        *(f"- {note}" for note in notes),
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("recordings", nargs="?", type=Path, default=ROOT / "data" / "recordings")
    parser.add_argument("--out", type=Path, default=ROOT / "docs" / "eval" / "model.md")
    parser.add_argument("--settle", type=int, default=SETTLE_MS, help="ms dropped from the start of each seal clip")
    args = parser.parse_args()
    sessions = load(args.recordings)
    if len(sessions) < 2:
        parser.exit(1, f"Need at least 2 sessions in {args.recordings} to hold one out.\n")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(report(sessions, args.settle) + "\n")
    print(f"Wrote {args.out} from {len(sessions)} sessions")


if __name__ == "__main__":
    main()
