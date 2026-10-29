"""Read recorded sessions (src/runtime/recording.ts, version 1) into clips."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

RECORD_VERSION = 1
NONE = "none"


@dataclass
class Frame:
    t: int
    hands: list[list[dict]]
    aspect: float
    handedness: list[dict] = field(default_factory=list)
    # The latest image embedding at this frame. The recorder stores each one
    # once; load() carries it forward within the clip, as the app does live.
    embedding: list[float] | None = None


@dataclass
class Clip:
    label: str
    start: int
    end: int | None
    frames: list[Frame]
    steps: list[str] | None = None

    @property
    def truth(self) -> str:
        """The evaluation class: a seal id, or `none` for every `none:*` label."""
        return NONE if self.label.startswith("none:") else self.label

    @property
    def is_sequence(self) -> bool:
        return self.label.startswith("sequence:")


@dataclass
class Session:
    info: dict
    clips: list[Clip]
    path: Path | None = None

    @property
    def name(self) -> str:
        return self.path.stem if self.path else self.info.get("session", "?")

    @property
    def person(self) -> str:
        return self.info.get("person", "")


def read_session(text: str, path: Path | None = None) -> Session:
    """Parse one JSONL session. Raises ValueError on malformed input."""
    info: dict | None = None
    clips: dict[int, Clip] = {}
    for number, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        kind = row.pop("type", None)
        clip_id = row.pop("clip", None)
        if kind == "session":
            info = row
        elif kind == "clip":
            clips[clip_id] = Clip(
                label=row["label"],
                start=row["start"],
                end=row.get("end"),
                steps=row.get("steps"),
                frames=[],
            )
        elif kind == "frame":
            if clip_id not in clips:
                raise ValueError(f"line {number}: frame before clip {clip_id}")
            clips[clip_id].frames.append(
                Frame(
                    t=row["t"],
                    hands=row["hands"],
                    aspect=row["aspect"],
                    handedness=row.get("handedness", []),
                    embedding=row.get("embedding"),
                )
            )
        else:
            raise ValueError(f"line {number}: unknown line type {kind!r}")
    if info is None:
        raise ValueError("missing session line")
    if info.get("version") != RECORD_VERSION:
        raise ValueError(f"unsupported recording version {info.get('version')}")
    ordered = [clips[k] for k in sorted(clips)]
    for clip in ordered:
        latest = None
        for frame in clip.frames:
            latest = frame.embedding or latest
            frame.embedding = latest
    return Session(info=info, clips=ordered, path=path)


def load(directory: Path) -> list[Session]:
    """Every `*.jsonl` session in `directory`, sorted by file name."""
    return [
        read_session(path.read_text(), path)
        for path in sorted(directory.glob("*.jsonl"))
    ]
