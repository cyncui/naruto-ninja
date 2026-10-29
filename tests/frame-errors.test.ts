import test from "node:test";
import assert from "node:assert/strict";
import { FrameErrors } from "../src/runtime/frame-errors.ts";

test("only a run of failed frames gives up on a worker", (t) => {
  t.mock.method(console, "warn", () => {});
  const errors = new FrameErrors(3);
  assert.equal(errors.failed("Hand tracking", "a"), false);
  assert.equal(errors.failed("Hand tracking", "b"), false);
  errors.ok();
  assert.equal(errors.failed("Hand tracking", "c"), false);
  assert.equal(errors.failed("Hand tracking", "d"), false);
  assert.equal(errors.failed("Hand tracking", "e"), true);
});
