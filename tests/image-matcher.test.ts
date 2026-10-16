import test from "node:test";
import assert from "node:assert/strict";
import { CENTER_REGION, CropMemory, handRegion } from "../src/runtime/crop.ts";
import {
  compactEmbedding,
  cosineDistance,
  diagnoseEmbedding,
  readEmbeddings,
} from "../src/runtime/embedding.ts";
import { rms, SteadyCapture } from "../src/runtime/teach.ts";

const unit = (...values: number[]) => {
  const norm = Math.hypot(...values);
  return values.map((v) => v / norm);
};

test("cosine distance is zero for the same direction and ignores length", () => {
  assert.equal(cosineDistance([1, 2, 3], [2, 4, 6]).toFixed(6), "0.000000");
  assert.equal(cosineDistance([1, 0], [0, 1]), 1);
  assert.equal(cosineDistance([1, 0], [-1, 0]), 2);
  assert.equal(cosineDistance([0, 0], [1, 0]), 1);
});

test("image diagnosis matches, rejects far poses and flags near ties", () => {
  const snake = unit(1, 0, 0);
  const tiger = unit(0, 1, 0);
  const three = (v: number[]) => [v, v, v];
  assert.equal(diagnoseEmbedding(null, {}).reason, "no-hands");
  assert.equal(
    diagnoseEmbedding(snake, { snake: [snake, snake] }).reason,
    "uncalibrated",
  );
  assert.deepEqual(
    diagnoseEmbedding(snake, { snake: three(snake), tiger: three(tiger) }),
    {
      reason: "match",
      best: "snake",
      distance: 0,
    },
  );
  const between = unit(1, 1, 0);
  const far = diagnoseEmbedding(between, { snake: three(snake) });
  assert.equal(far.reason, "no-match");
  const tie = diagnoseEmbedding(unit(1, 1, 0.01), {
    snake: three(unit(1, 0.98, 0)),
    tiger: three(unit(0.98, 1, 0)),
  });
  assert.equal(tie.reason, "ambiguous");
  assert.equal(
    diagnoseEmbedding(snake, { snake: three([1, 0]) }).reason,
    "uncalibrated",
    "samples of another embedding size are never compared",
  );
});

test("hand crop is square on screen, padded and kept inside the frame", () => {
  assert.equal(handRegion([], 16 / 9), null);
  const hand = [
    { x: 0.45, y: 0.4 },
    { x: 0.55, y: 0.6 },
  ];
  const region = handRegion([hand], 16 / 9)!;
  const width = (region.right - region.left) * (16 / 9);
  const height = region.bottom - region.top;
  assert.ok(Math.abs(width - height) < 1e-9, "square in pixels");
  assert.ok(height > 0.2, "padded beyond the hand");
  assert.ok(region.left < 0.45 && region.right > 0.55);
  const edge = handRegion(
    [
      [
        { x: 0.98, y: 0.02 },
        { x: 1, y: 0.1 },
      ],
    ],
    1,
  )!;
  assert.ok(
    edge.left >= 0 && edge.top >= 0 && edge.right <= 1 && edge.bottom <= 1,
  );
  assert.ok(CENTER_REGION.right > CENTER_REGION.left);
});

test("stored embeddings are compact and validated", () => {
  assert.deepEqual(compactEmbedding([0.123456, -0.98768]), [0.1235, -0.9877]);
  const sample = [0.5, -0.5];
  assert.deepEqual(readEmbeddings("{broken", new Set(["rat"])), {});
  assert.deepEqual(
    readEmbeddings(
      JSON.stringify({ rat: [[2]], fake: [sample] }),
      new Set(["rat"]),
    ),
    {},
  );
  assert.equal(
    readEmbeddings(JSON.stringify({ rat: [sample, sample] }), new Set(["rat"]))
      .rat.length,
    2,
  );
});

test("crop memory falls back from hands to the recent box to the centre", () => {
  const memory = new CropMemory();
  const hands = [
    [
      { x: 0.2, y: 0.3 },
      { x: 0.3, y: 0.4 },
    ],
  ];
  const seen = memory.next(hands, 1, 0);
  assert.equal(seen.source, "hands");
  assert.deepEqual(memory.next([], 1, 900), {
    region: seen.region,
    source: "recent",
  });
  assert.deepEqual(memory.next([], 1, 1100), {
    region: CENTER_REGION,
    source: "center",
  });
});

test("steady capture samples a held pose and restarts when it moves", () => {
  const capture = new SteadyCapture(0.05, rms);
  const pose = [0, 0, 0, 0];
  assert.deepEqual(capture.update(pose, 0), { hold: 0, sample: null });
  assert.equal(capture.update(pose, 450).hold, 0.5);
  assert.deepEqual(capture.update(pose, 900), { hold: 1, sample: pose });
  assert.equal(
    capture.update(pose, 1000).sample,
    null,
    "next hold starts over",
  );
  assert.deepEqual(capture.update([1, 1, 1, 1], 1500), {
    hold: 0,
    sample: null,
  });
  assert.deepEqual(capture.update(null, 1600), { hold: 0, sample: null });
  assert.equal(capture.update([0, 0], 1700).hold, 0, "hand count changed");
});
