import test from "node:test";
import assert from "node:assert/strict";
import { advanceSequence, StableSeal } from "../src/runtime/sequence.ts";
import {
  classify,
  diagnose,
  features,
  readTemplates,
} from "../src/runtime/recognition.ts";

test("repeated seals require distinct events, empty sequences never cast", () => {
  const sequence = ["rat", "dog", "dog"];
  let progress = 0;
  for (const seal of sequence)
    progress = advanceSequence(sequence, progress, seal).progress;
  assert.equal(progress, 3);
  assert.equal(advanceSequence([], 0, "rat").complete, false);
  assert.deepEqual(advanceSequence(sequence, 2, "rat"), {
    progress: 1,
    complete: false,
    correct: false,
  });
});
test("stable tracking emits once per hold, allows repeat after deliberate release", () => {
  const stable = new StableSeal();
  assert.equal(stable.update("dog", 0), null);
  assert.equal(stable.update("dog", 349), null);
  assert.equal(stable.update("dog", 350), "dog");
  assert.equal(stable.update("dog", 1000), null);
  stable.update(null, 1010);
  stable.update(null, 1200);
  assert.equal(stable.update("dog", 1201), null);
  assert.equal(stable.update("dog", 1600), "dog");
});
test("brief tracking loss cannot count as a second seal", () => {
  const stable = new StableSeal();
  stable.update("dog", 0);
  stable.update("dog", 400);
  stable.update(null, 410);
  stable.update("dog", 430);
  assert.equal(stable.update("dog", 800), null);
});
test("a held seal is not emitted twice after teaching", () => {
  const stable = new StableSeal();
  stable.hold("ram", 0);
  assert.equal(stable.update("ram", 400), null);
  assert.equal(stable.update(null, 500), null);
  assert.equal(stable.update(null, 700), null);
  assert.equal(stable.update("ram", 750), null);
  assert.equal(stable.update("ram", 1100), "ram");
});
test("classifier rejects insufficient, distant and ambiguous samples", () => {
  const vector = Array(84).fill(0);
  assert.equal(classify(vector, { rat: [vector, vector] }), null);
  assert.equal(classify(vector, { rat: [vector, vector, vector] }), "rat");
  assert.equal(
    classify(Array(84).fill(1), { rat: [vector, vector, vector] }),
    null,
  );
  assert.equal(
    classify(vector, {
      rat: [vector, vector, vector],
      ox: [vector, vector, vector],
    }),
    null,
  );
  assert.equal(features([], 1), null);
});
test("diagnosis explains each rejected pose", () => {
  const hand = (x: number, size = 0.1) =>
    Array.from({ length: 21 }, (_, i) => ({
      x: x + (i % 4) * size * 0.1,
      y: 0.6 - (i / 20) * size,
    }));
  const hands = [hand(0.3), hand(0.6)];
  const pose = features(hands, 1)!;
  const far = pose.map((value) => value + 1);
  assert.equal(diagnose([], 1, {}).reason, "no-hands");
  const clasp = features([hand(0.3)], 1)!;
  assert.equal(clasp.length, 42);
  assert.equal(diagnose([hand(0.3)], 1, {}).reason, "uncalibrated");
  assert.equal(
    diagnose([hand(0.3)], 1, { rat: [clasp, clasp, clasp] }).reason,
    "match",
  );
  assert.deepEqual(diagnose([hand(0.3)], 1, { rat: [pose, pose, pose] }), {
    reason: "hand-count",
    hands: 1,
  });
  assert.equal(
    diagnose([hand(0.3, 0.01), hand(0.31, 0.01)], 1, {}).reason,
    "too-small",
  );
  assert.equal(
    diagnose(hands, 1, { rat: [pose, pose] }).reason,
    "uncalibrated",
  );
  assert.deepEqual(diagnose(hands, 1, { rat: [pose, pose, pose] }), {
    reason: "match",
    best: "rat",
    distance: 0,
  });
  assert.equal(diagnose(hands, 1, { rat: [far, far, far] }).reason, "no-match");
  assert.deepEqual(
    diagnose(hands, 1, { rat: [pose, pose, pose], ox: [pose, pose, pose] }),
    { reason: "ambiguous", best: "rat", distance: 0, runnerUp: "ox" },
  );
});
test("calibration parser rejects corrupt and unknown entries", () => {
  assert.deepEqual(readTemplates("{broken", new Set(["rat"])), {});
  assert.deepEqual(
    readTemplates('{"rat":[[0]],"fake":[]}', new Set(["rat"])),
    {},
  );
  const sample = Array(84).fill(0);
  assert.equal(
    readTemplates(
      JSON.stringify({ rat: [sample, sample, sample] }),
      new Set(["rat"]),
    ).rat.length,
    3,
  );
});

test("two-hand features are invariant to image translation and common scale", () => {
  const hands = [0.2, 0.6].map((x) =>
    Array.from({ length: 21 }, (_, i) => ({
      x: x + i * 0.002,
      y: 0.7 - i * 0.012,
    })),
  );
  const original = features(hands, 4 / 3)!;
  const moved = features(
    hands.map((hand) =>
      hand.map((p) => ({ x: p.x * 0.7 + 0.1, y: p.y * 0.7 + 0.1 })),
    ),
    4 / 3,
  )!;
  assert.equal(original.length, 84);
  original.forEach((value, i) => assert.ok(Math.abs(value - moved[i]) < 1e-10));
  assert.deepEqual(features([...hands].reverse(), 4 / 3), original);
});
