import test from "node:test";
import assert from "node:assert/strict";
import { readSession, SessionRecorder } from "../src/runtime/recording.ts";

const info = {
  session: "ab12",
  person: "P1 Home",
  place: "desk",
  lighting: "daylight",
  notes: "",
  device: "test",
  matcher: "landmarks",
  startedAt: "2026-10-21T10:00:00.000Z",
};
const hand = (x: number) =>
  Array.from({ length: 21 }, (_, i) => ({ x: x + i / 1e5, y: 0.5, z: 0.1 }));

test("frames are only recorded inside a clip, including frames with no hands", () => {
  const rec = new SessionRecorder(info, 1000);
  assert.equal(rec.frame({ hands: [hand(0.4)], aspect: 1.5 }, 1010), false);
  rec.startClip("tiger", 1100);
  assert.equal(rec.recording, true);
  rec.frame({ hands: [hand(0.3), hand(0.6)], aspect: 1.5 }, 1150);
  rec.frame({ hands: [], aspect: 1.5 }, 1200);
  rec.frame({ hands: [hand(0.4)], aspect: 1.5 }, 1250);
  rec.endClip(1300);
  assert.equal(rec.recording, false);
  assert.deepEqual(rec.stats(), [
    { label: "tiger", clips: 1, frames: 3, hands: [1, 1, 1] },
  ]);
});

test("empty clips are dropped and the last clip can be discarded", () => {
  const rec = new SessionRecorder(info, 0);
  rec.startClip("rat", 0);
  rec.endClip(10);
  assert.equal(rec.clips.length, 0);
  rec.startClip("rat", 20);
  rec.frame({ hands: [], aspect: 1 }, 30);
  rec.startClip("ox", 40); // starting a clip closes the open one
  rec.frame({ hands: [], aspect: 1 }, 50);
  rec.endClip(60);
  assert.deepEqual(
    rec.clips.map((c) => c.label),
    ["rat", "ox"],
  );
  assert.equal(rec.discardLastClip()?.label, "ox");
  assert.equal(rec.clips.length, 1);
});

test("each embedding is stored once, rounded, with its crop", () => {
  const rec = new SessionRecorder(info, 0);
  const embedding = [0.123456, -0.5];
  rec.startClip("none:rest", 0);
  rec.frame({ hands: [], aspect: 1, embedding, crop: "hands" }, 10);
  rec.frame({ hands: [], aspect: 1, embedding, crop: "hands" }, 20);
  rec.frame(
    { hands: [], aspect: 1, embedding: [0.1, 0.2], crop: "recent" },
    30,
  );
  rec.endClip(40);
  const [first, second, third] = rec.clips[0].frames;
  assert.deepEqual(first.embedding, [0.1235, -0.5]);
  assert.equal(first.crop, "hands");
  assert.equal(second.embedding, undefined);
  assert.equal(third.crop, "recent");
});

test("a session survives a JSONL round trip", () => {
  const rec = new SessionRecorder(info, 500);
  rec.startClip("sequence:fireball", 600, ["snake", "ram", "monkey"]);
  rec.frame(
    {
      hands: [hand(0.3), hand(0.7)],
      handedness: [
        { label: "Left", score: 0.98765 },
        { label: "Right", score: 0.9 },
      ],
      aspect: 16 / 9,
    },
    633,
  );
  rec.endClip(700);
  const text = rec.toJSONL();
  assert.equal(text.trim().split("\n").length, 3);
  const { info: read, clips } = readSession(text);
  assert.equal(read.version, 1);
  assert.equal(read.person, "P1 Home");
  assert.equal(clips[0].label, "sequence:fireball");
  assert.deepEqual(clips[0].steps, ["snake", "ram", "monkey"]);
  assert.equal(clips[0].start, 100);
  assert.equal(clips[0].end, 200);
  const frame = clips[0].frames[0];
  assert.equal(frame.t, 133);
  assert.equal(frame.aspect, 1.7778);
  assert.equal(frame.hands[1][20].x, 0.7002);
  assert.deepEqual(frame.handedness[0], { label: "Left", score: 0.9877 });
  assert.equal(rec.fileName(), "session-2026-10-21-p1-home-ab12.jsonl");
});

test("malformed sessions are rejected", () => {
  assert.throws(() => readSession(""), /Missing session/);
  assert.throws(
    () => readSession('{"type":"session","version":2}\n'),
    /Unsupported/,
  );
  assert.throws(
    () =>
      readSession(
        '{"type":"session","version":1}\n{"type":"frame","clip":0,"t":1}\n',
      ),
    /Frame before clip/,
  );
});
