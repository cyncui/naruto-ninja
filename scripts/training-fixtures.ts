// Writes training/tests/fixtures/parity.json: inputs and the app's own outputs
// for features(), diagnose(), diagnoseEmbedding(), StableSeal, advanceSequence
// and SteadyCapture, plus a SessionRecorder file for the loader. The Python port in training/ is tested against this file.
// Run with `npm run fixtures:training` after changing any of those functions.
import { writeFileSync } from "node:fs";
import { diagnose, features } from "../src/runtime/recognition.ts";
import type { Point, Templates } from "../src/runtime/recognition.ts";
import { cosineDistance, diagnoseEmbedding } from "../src/runtime/embedding.ts";
import { advanceSequence, StableSeal } from "../src/runtime/sequence.ts";
import { SessionRecorder } from "../src/runtime/recording.ts";
import { rms, SteadyCapture } from "../src/runtime/teach.ts";

// Deterministic so the fixture only changes when the app's code does.
let seed = 7;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};
const round = (n: number) => Math.round(n * 1e4) / 1e4;
// Wrist at (x, y) and middle knuckle `size / 2` above it fix the hand's scale.
const hand = (x: number, y: number, size: number): Point[] => {
  const points = Array.from({ length: 21 }, () => ({
    x: round(x + (random() - 0.5) * size),
    y: round(y + (random() - 0.5) * size),
    z: round(random() * 0.1),
  }));
  points[0] = { ...points[0], x, y };
  points[9] = { ...points[9], x, y: round(y - size / 2) };
  return points;
};

const featureCases = [
  { hands: [hand(0.3, 0.5, 0.2), hand(0.7, 0.5, 0.2)], aspect: 16 / 9 },
  { hands: [hand(0.7, 0.4, 0.2), hand(0.3, 0.6, 0.2)], aspect: 4 / 3 },
  { hands: [hand(0.5, 0.5, 0.3)], aspect: 1.5 },
  { hands: [hand(0.5, 0.5, 0.01)], aspect: 1.5 },
  { hands: [], aspect: 1.5 },
  {
    hands: [hand(0.2, 0.5, 0.2), hand(0.5, 0.5, 0.2), hand(0.8, 0.5, 0.2)],
    aspect: 1.5,
  },
].map((input) => ({ ...input, expected: features(input.hands, input.aspect) }));

const pose = () => [hand(0.35, 0.5, 0.25), hand(0.65, 0.5, 0.25)];
const nudge = (hands: Point[][], by: number) =>
  hands.map((h) =>
    h.map((p) => ({
      x: round(p.x + (random() - 0.5) * by),
      y: round(p.y + (random() - 0.5) * by),
      z: p.z,
    })),
  );
const rat = pose();
// Ox sits close to rat so a pose between them is ambiguous.
const poses = { tiger: pose(), rat, ox: nudge(rat, 0.004) };
const templates: Templates = Object.fromEntries(
  Object.entries(poses).map(([id, hands]) => [
    id,
    [0, 1, 2].map(() => features(nudge(hands, 0.01), 1.5)!),
  ]),
);
templates.dog = [features(pose(), 1.5)!]; // under three samples: ignored
const diagnoseCases = [
  { hands: nudge(poses.tiger, 0.01), aspect: 1.5 },
  { hands: nudge(poses.tiger, 0.06), aspect: 1.5 },
  { hands: nudge(poses.rat, 0.004), aspect: 1.5 },
  { hands: pose(), aspect: 1.5 },
  { hands: [poses.ox[0]], aspect: 1.5 },
  { hands: [], aspect: 1.5 },
  { hands: [hand(0.5, 0.5, 0.01)], aspect: 1.5 },
].map((input) => ({
  ...input,
  expected: diagnose(input.hands, input.aspect, templates),
}));

const unit = (n: number) => {
  const v = Array.from({ length: n }, () => random() - 0.5);
  const norm = Math.hypot(...v);
  return v.map((x) => round(x / norm));
};
const centres = { tiger: unit(16), rat: unit(16) };
const jitter = (v: number[], by: number) =>
  v.map((x) => round(x + (random() - 0.5) * by));
const imageTemplates: Templates = Object.fromEntries(
  Object.entries(centres).map(([id, c]) => [
    id,
    [0, 1, 2].map(() => jitter(c, 0.05)),
  ]),
);
const embeddingCases = [
  jitter(centres.tiger, 0.05),
  jitter(centres.rat, 0.4),
  unit(16),
  null,
].map((embedding) => ({
  embedding,
  expected: diagnoseEmbedding(embedding, imageTemplates),
}));

const stableInput: [string | null, number][] = [
  ["tiger", 0],
  ["tiger", 200],
  ["tiger", 320],
  ["tiger", 360],
  ["tiger", 500],
  [null, 560],
  ["tiger", 600],
  ["tiger", 1000],
  [null, 1100],
  [null, 1300],
  ["tiger", 1400],
  ["tiger", 1800],
  ["rat", 1850],
  ["rat", 2250],
];
const stable = new StableSeal();
const stableExpected = stableInput.map(([label, t]) => stable.update(label, t));

const steps = ["rat", "ox", "rat", "tiger"];
const sequenceCases: { progress: number; seal: string }[] = [
  { progress: 0, seal: "rat" },
  { progress: 1, seal: "ox" },
  { progress: 2, seal: "ox" },
  { progress: 2, seal: "rat" },
  { progress: 3, seal: "tiger" },
  { progress: 1, seal: "rat" },
];

const steadyInput = Array.from({ length: 40 }, (_, i) => ({
  t: i * 66,
  vector:
    i === 30
      ? null
      : features(nudge(poses.tiger, i % 20 === 19 ? 0.2 : 0.002), 1.5),
}));
const steady = new SteadyCapture(0.08, rms);
const steadyExpected = steadyInput.map(({ vector, t }) => {
  const { hold, sample } = steady.update(vector, t);
  return { hold, sampled: sample !== null };
});

// Embeddings arrive slower than tracker frames, so only some frames carry one.
const recorder = new SessionRecorder(
  {
    session: "fx01",
    person: "P1",
    place: "desk",
    lighting: "lamp",
    notes: "",
    device: "fixture",
    matcher: "image",
    startedAt: "2026-10-29T10:00:00.000Z",
  },
  0,
);
const shared = jitter(centres.tiger, 0.01);
recorder.startClip("tiger", 0);
recorder.frame({ hands: poses.tiger, aspect: 1.5 }, 66);
recorder.frame(
  { hands: poses.tiger, aspect: 1.5, embedding: shared, crop: "c" },
  132,
);
recorder.frame({ hands: [], aspect: 1.5, embedding: shared }, 198);
recorder.startClip("sequence:demo", 300, ["rat", "tiger"]);
recorder.frame({ hands: [poses.rat[0]], aspect: 1.5 }, 366);
recorder.endClip(400);

const fixture = {
  session: recorder.toJSONL(),
  features: featureCases,
  diagnose: { templates, cases: diagnoseCases },
  embedding: {
    templates: imageTemplates,
    cases: embeddingCases,
    cosine: {
      a: centres.tiger,
      b: centres.rat,
      expected: cosineDistance(centres.tiger, centres.rat),
    },
  },
  stable: { input: stableInput, expected: stableExpected },
  sequence: {
    steps,
    cases: sequenceCases.map((c) => ({
      ...c,
      expected: advanceSequence(steps, c.progress, c.seal),
    })),
  },
  steady: { steady: 0.08, input: steadyInput, expected: steadyExpected },
};
const out = new URL("../training/tests/fixtures/parity.json", import.meta.url);
writeFileSync(out, JSON.stringify(fixture, null, 1) + "\n");
console.log(`Wrote ${out.pathname}`);
