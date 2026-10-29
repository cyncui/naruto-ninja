"""Milestone 2: score the shipped nearest-example matchers on recorded sessions.

For every ordered pair of sessions, calibrate on one the way hands-free
teaching does (SteadyCapture, first N samples per seal) and replay the other
through diagnose() with the shipped thresholds. Writes a markdown report.

    uv run baseline.py [recordings] [--out ../docs/eval/baseline.md]
"""

from __future__ import annotations

import argparse
import datetime
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from load import NONE, Clip, Frame, Session, load
from matchers import (
    IMAGE_STEADY,
    LANDMARK_STEADY,
    TEACH_SAMPLES,
    StableSeal,
    SteadyCapture,
    Templates,
    Vector,
    advance_sequence,
    cosine_distance,
    diagnose,
    diagnose_embedding,
    features,
    rms,
)

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Matcher:
    name: str
    vector: Callable[[Frame], Vector | None]
    diagnose: Callable[[Frame, Templates], dict]
    steady: float
    distance: Callable[[Vector, Vector], float]


MATCHERS = [
    Matcher(
        "landmarks",
        lambda f: features(f.hands, f.aspect),
        lambda f, t: diagnose(f.hands, f.aspect, t),
        LANDMARK_STEADY,
        rms,
    ),
    Matcher(
        "image",
        lambda f: f.embedding,
        lambda f, t: diagnose_embedding(f.embedding, t),
        IMAGE_STEADY,
        cosine_distance,
    ),
]


def seal_clips(session: Session) -> list[Clip]:
    return [c for c in session.clips if c.truth != NONE and not c.is_sequence]


def calibrate(session: Session, matcher: Matcher, samples: int) -> Templates:
    """The first `samples` steady holds per seal, as hands-free teaching takes them."""
    templates: Templates = {}
    for clip in seal_clips(session):
        stored = templates.setdefault(clip.label, [])
        capture = SteadyCapture(matcher.steady, matcher.distance)
        for frame in clip.frames:
            if len(stored) >= samples:
                break
            _, sample = capture.update(matcher.vector(frame), frame.t)
            if sample:
                stored.append(sample)
    return templates


def predicted(diagnosis: dict) -> str:
    return diagnosis["best"] if diagnosis["reason"] == "match" else NONE


@dataclass
class Score:
    confusion: Counter = field(default_factory=Counter)
    reasons: Counter = field(default_factory=Counter)
    none_ms: float = 0
    false_triggers: int = 0
    sequences: int = 0
    completed: int = 0
    pairs: int = 0
    calibrated: Counter = field(default_factory=Counter)


def score_pair(calibration: Session, test: Session, matcher: Matcher, samples: int, score: Score):
    templates = calibrate(calibration, matcher, samples)
    score.pairs += 1
    for seal, stored in templates.items():
        if len(stored) >= 3:
            score.calibrated[seal] += 1
    for clip in test.clips:
        stable = StableSeal()
        progress = 0
        complete = False
        for frame in clip.frames:
            diagnosis = matcher.diagnose(frame, templates)
            label = predicted(diagnosis)
            emitted = stable.update(None if label == NONE else label, frame.t)
            if clip.is_sequence:
                if emitted and clip.steps:
                    step = advance_sequence(clip.steps, progress, emitted)
                    progress, complete = step["progress"], complete or step["complete"]
                continue
            score.confusion[clip.truth, label] += 1
            score.reasons[clip.truth, diagnosis["reason"]] += 1
            if clip.truth == NONE and emitted:
                score.false_triggers += 1
        if clip.is_sequence:
            score.sequences += 1
            score.completed += complete
        elif clip.truth == NONE and clip.frames:
            score.none_ms += clip.frames[-1].t - clip.frames[0].t


def evaluate(sessions: list[Session], matcher: Matcher, samples: int) -> Score:
    score = Score()
    pairs = [(a, b) for a in sessions for b in sessions if a is not b] or [
        (s, s) for s in sessions
    ]
    for calibration, test in pairs:
        score_pair(calibration, test, matcher, samples, score)
    return score


def classes(sessions: list[Session]) -> list[str]:
    seals = sorted({c.truth for s in sessions for c in s.clips if not c.is_sequence} - {NONE})
    return seals + [NONE]


def pct(n: float, d: float) -> str:
    return f"{100 * n / d:.0f}%" if d else "–"


def table(header: list[str], rows: list[list[str]]) -> list[str]:
    return [
        "| " + " | ".join(header) + " |",
        "|" + "|".join("---" for _ in header) + "|",
        *("| " + " | ".join(row) + " |" for row in rows),
    ]


REASONS = ["match", "ambiguous", "no-match", "hand-count", "too-small", "no-hands", "uncalibrated"]


def matcher_section(name: str, score: Score, labels: list[str]) -> list[str]:
    out = [f"## {name}", ""]
    if not score.confusion:
        return out + ["No frames to score.", ""]
    rows = []
    for label in labels:
        frames = sum(n for (t, _), n in score.confusion.items() if t == label)
        hits = score.confusion[label, label]
        said = sum(n for (_, p), n in score.confusion.items() if p == label)
        wrong = Counter(
            {p: n for (t, p), n in score.confusion.items() if t == label and p != label}
        ).most_common(1)
        rows.append(
            [
                label,
                str(frames),
                pct(hits, said),
                pct(hits, frames),
                f"{wrong[0][0]} ({pct(wrong[0][1], frames)})" if wrong else "–",
                f"{score.calibrated[label]}/{score.pairs}" if label != NONE else "–",
            ]
        )
    out += table(
        ["Class", "Frames", "Precision", "Recall", "Most confused with", "Calibrated"], rows
    )
    minutes = score.none_ms / 60000
    out += [
        "",
        "Calibrated: calibration sessions that yielded the 3 samples a seal needs.",
        "",
        f"False triggers on `none` clips: {score.false_triggers} in {minutes:.1f} min"
        + (f" ({score.false_triggers / minutes:.1f} per minute)." if minutes else "."),
        "",
        f"Sequences completed: {score.completed} of {score.sequences}"
        + (f" ({pct(score.completed, score.sequences)})." if score.sequences else "."),
        "",
        "### Confusion matrix",
        "",
        "Rows are the recorded label, columns the accepted prediction (`none` = rejected).",
        "",
    ]
    out += table(
        ["", *labels],
        [[t, *(str(score.confusion[t, p] or "") for p in labels)] for t in labels],
    )
    out += ["", "### Rejection reasons", ""]
    out += table(
        ["Class", *REASONS],
        [
            [t, *(pct(score.reasons[t, r], sum(score.reasons[t, x] for x in REASONS)) for r in REASONS)]
            for t in labels
        ],
    )
    return out + [""]


def coverage(sessions: list[Session], labels: list[str]) -> list[str]:
    counts = {label: [0, 0, 0] for label in labels}
    for session in sessions:
        for clip in session.clips:
            if clip.is_sequence:
                continue
            for frame in clip.frames:
                counts[clip.truth][min(len(frame.hands), 2)] += 1
    rows = [[label, *(pct(n, sum(c)) for n in c)] for label, c in counts.items()]
    return ["## Tracking coverage", "", *table(["Class", "0 hands", "1 hand", "2 hands"], rows), ""]


def report(sessions: list[Session], samples: int) -> str:
    labels = classes(sessions)
    lines = [
        "# Baseline evaluation",
        "",
        f"Generated {datetime.date.today().isoformat()} by `training/baseline.py` "
        f"with {samples} calibration samples per seal and the thresholds shipped in "
        "`src/runtime`.",
        "",
    ]
    if len(sessions) == 1:
        lines += [
            "**Only one session**: it is used for both calibration and testing, so "
            "these numbers are optimistic. Record a second session for a held-out result.",
            "",
        ]
    else:
        lines += [
            f"Each of the {len(sessions)} sessions calibrates the matcher in turn and every "
            "other session is replayed against it.",
            "",
        ]
    lines += table(
        ["Session", "Person", "Place", "Lighting", "Clips", "Frames"],
        [
            [
                s.name,
                s.person,
                s.info.get("place", ""),
                s.info.get("lighting", ""),
                str(len(s.clips)),
                str(sum(len(c.frames) for c in s.clips)),
            ]
            for s in sessions
        ],
    )
    lines += [""] + coverage(sessions, labels)
    embedded = any(f.embedding for s in sessions for c in s.clips for f in c.frames)
    for matcher in MATCHERS:
        if matcher.name == "image" and not embedded:
            lines += [
                "## image",
                "",
                "No frames carry an embedding. Record with `/?record&matcher=image` to score this matcher.",
                "",
            ]
            continue
        lines += matcher_section(matcher.name, evaluate(sessions, matcher, samples), labels)
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("recordings", nargs="?", type=Path, default=ROOT / "data" / "recordings")
    parser.add_argument("--out", type=Path, default=ROOT / "docs" / "eval" / "baseline.md")
    parser.add_argument("--samples", type=int, default=TEACH_SAMPLES, choices=range(3, 13))
    args = parser.parse_args()
    sessions = load(args.recordings)
    if not sessions:
        parser.exit(1, f"No *.jsonl sessions in {args.recordings}. Record one at /?record.\n")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(report(sessions, args.samples) + "\n")
    print(f"Wrote {args.out} from {len(sessions)} session(s)")


if __name__ == "__main__":
    main()
