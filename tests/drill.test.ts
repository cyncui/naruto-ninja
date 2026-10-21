import test from "node:test";
import assert from "node:assert/strict";
import { isBetter, makeQueue, readBest } from "../src/drill.ts";

test("drill queue has the requested length and never repeats back to back", () => {
  const ids = ["rat", "ox", "tiger"];
  let seed = 0;
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const queue = makeQueue(ids, 50, random);
  assert.equal(queue.length, 50);
  assert.ok(queue.every((id) => ids.includes(id)));
  assert.ok(queue.every((id, i) => i === 0 || id !== queue[i - 1]));
});

test("best result prefers more correct answers, then a faster time", () => {
  const best = { correct: 8, total: 10, time: 30 };
  assert.equal(isBetter(best, null), true);
  assert.equal(isBetter({ correct: 9, total: 10, time: 60 }, best), true);
  assert.equal(isBetter({ correct: 8, total: 10, time: 25 }, best), true);
  assert.equal(isBetter({ correct: 8, total: 10, time: 31 }, best), false);
  assert.equal(isBetter({ correct: 7, total: 10, time: 5 }, best), false);
});

test("stored best results are validated", () => {
  assert.equal(readBest(null), null);
  assert.equal(readBest("{broken"), null);
  assert.equal(readBest('{"correct":"9","total":10,"time":3}'), null);
  assert.deepEqual(readBest('{"correct":9,"total":10,"time":3.5,"x":1}'), {
    correct: 9,
    total: 10,
    time: 3.5,
  });
});
