import test from "node:test";
import assert from "node:assert/strict";
import { bends, handPoints } from "../src/pose/hand.ts";
import type { HandPose, Side, Vec } from "../src/pose/hand.ts";
import { checkPose } from "../src/pose/feedback.ts";
import { sealPoses } from "../src/pose/seals.ts";

// What an unmirrored camera would report: the performer's right hand on the
// image's left, y downward, z negative toward the camera.
const asLandmarks = (points: Vec[]) =>
  points.map(([x, y, z]) => ({
    x: 0.5 - x / 600,
    y: 0.5 - y / 600,
    z: -z / 600,
  }));
const camera = (pose: { L: HandPose; R: HandPose }) =>
  (["L", "R"] as Side[]).map((side) =>
    asLandmarks(handPoints(side, pose[side])),
  );

test("hand model keeps bone lengths through any pose", () => {
  const pose: HandPose = {
    at: [10, 20, 30],
    turn: [40, -70, 25],
    curl: [0.3, 0.8, 1, 0],
    thumb: { spread: 50, lift: 30, curl: 0.5 },
  };
  const straight = handPoints("R", { ...pose, curl: [0, 0, 0, 0] });
  const bent = handPoints("R", pose);
  const length = (p: Vec[], a: number, b: number) =>
    Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1], p[a][2] - p[b][2]);
  for (const [a, b] of [
    [5, 6],
    [10, 11],
    [15, 16],
    [19, 20],
  ])
    assert.ok(Math.abs(length(straight, a, b) - length(bent, a, b)) < 1e-9);
});

test("bend measurement reads straight and curled fingers", () => {
  const pose = (curl: number): HandPose => ({
    at: [0, 0, 0],
    turn: [0, 0, 0],
    curl: [curl, curl, curl, curl],
    thumb: { spread: 10, lift: 0, curl: 0 },
  });
  assert.ok(bends(handPoints("R", pose(0))).index < 0.05);
  assert.ok(bends(handPoints("L", pose(1))).ring > 0.8);
});

test("every seal's reference pose passes its own checks", () => {
  for (const [id, seal] of Object.entries(sealPoses)) {
    const check = checkPose(id, camera(seal), 1);
    assert.equal(
      check?.state,
      "ok",
      `${id}: ${check?.issues.map((i) => i.text).join("; ")}`,
    );
  }
});

test("a wrongly bent finger is named with its hand", () => {
  const tiger = sealPoses.tiger;
  const curledIndex = {
    ...tiger,
    L: { ...tiger.L, curl: [0.9, 0, 0.9, 0.9] as HandPose["curl"] },
  };
  const check = checkPose("tiger", camera(curledIndex), 1)!;
  assert.equal(check.state, "issues");
  const fix = check.issues.find(
    (i) => i.text === "Straighten your left index finger",
  );
  assert.ok(fix, check.issues.map((i) => i.text).join("; "));
  assert.deepEqual(fix.digits, ["L:index"]);
});

test("missing or merged hands are explained before finger checks", () => {
  assert.equal(checkPose("tiger", [], 1)?.state, "no-hands");
  assert.equal(
    checkPose("tiger", camera(sealPoses.tiger).slice(0, 1), 1)?.state,
    "one-hand",
  );
  assert.equal(checkPose("not-a-seal", [], 1), null);
});
