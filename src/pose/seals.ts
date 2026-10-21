import type { HandPose, Side } from "./hand.ts";

// Reference poses for the twelve basic seals, estimated from the databook
// chart reproduced on Narutopedia's Hand Seal page. They are simplified
// models for learning and feedback, not traced from the artwork.

export type Rule =
  | { kind: "touch"; a: [Side, number]; b: [Side, number]; text: string }
  | { kind: "above"; top: Side; text: string }
  | { kind: "together"; text: string }
  | { kind: "point-down"; text: string }
  | { kind: "upright"; side: Side; text: string }
  | { kind: "sideways"; side: Side; text: string }
  | { kind: "thumbs-down"; text: string };

export interface SealPose {
  L: HandPose;
  R: HandPose;
  rules: Rule[];
}

const straight = { spread: 10, lift: 0, curl: 0 };
const mirror = (pose: HandPose): HandPose => ({
  ...pose,
  at: [-pose.at[0], pose.at[1], pose.at[2]],
  turn: [pose.turn[0], -pose.turn[1], -pose.turn[2]],
});
/** Hands facing each other, palm to palm, fingers up. */
const facing = (right: Omit<HandPose, "turn" | "at"> & Partial<HandPose>) => {
  const R: HandPose = { at: [13, 0, 0], turn: [0, -90, 0], ...right };
  return { R, L: mirror(R) };
};

/** Where every seal animates from: relaxed open hands. */
export const OPEN: { L: HandPose; R: HandPose } = (() => {
  const R: HandPose = {
    at: [70, -20, 10],
    turn: [0, -35, -10],
    curl: [0.15, 0.15, 0.2, 0.25],
    thumb: { spread: 22, lift: 15, curl: 0.1 },
  };
  return { R, L: mirror(R) };
})();

const twoUp: HandPose["curl"] = [0, 0, 0.9, 0.9];
const interlocked: HandPose["curl"] = [0.75, 0.75, 0.75, 0.75];

export const sealPoses: Record<string, SealPose> = {
  tiger: {
    ...facing({
      curl: twoUp,
      splay: [4, 2, 0, 0],
      thumb: { spread: 6, lift: 0, curl: 0 },
    }),
    rules: [
      { kind: "together", text: "Press your palms together" },
      {
        kind: "touch",
        a: ["L", 8],
        b: ["R", 8],
        text: "Bring your index fingertips together",
      },
    ],
  },
  ram: {
    R: {
      at: [13, 0, 0],
      turn: [0, -90, 0],
      curl: twoUp,
      splay: [4, 2, 0, 0],
      thumb: { spread: 6, lift: 0, curl: 0 },
    },
    L: {
      at: [-13, 0, 0],
      turn: [0, 90, 0],
      curl: twoUp,
      splay: [4, 2, 0, 0],
      thumb: { spread: 45, lift: 35, curl: 0.2 },
    },
    rules: [
      { kind: "together", text: "Hold your hands together" },
      {
        kind: "touch",
        a: ["L", 8],
        b: ["R", 8],
        text: "Bring your index fingertips together",
      },
    ],
  },
  snake: {
    R: {
      at: [13, 0, 0],
      turn: [0, -90, 0],
      curl: interlocked,
      thumb: { spread: 12, lift: 0, curl: 0 },
    },
    L: {
      at: [-13, 6, 0],
      turn: [0, 90, 0],
      curl: interlocked,
      thumb: { spread: 45, lift: 35, curl: 0.2 },
    },
    rules: [{ kind: "together", text: "Press your palms together" }],
  },
  dragon: {
    R: {
      at: [13, 0, 0],
      turn: [0, -90, 0],
      curl: interlocked,
      thumb: { spread: 165, lift: 10, curl: 0 },
    },
    L: {
      at: [-13, 6, 0],
      turn: [0, 90, 0],
      curl: interlocked,
      thumb: { spread: 160, lift: 25, curl: 0 },
    },
    rules: [
      { kind: "together", text: "Press your hands together" },
      { kind: "thumbs-down", text: "Point both thumbs down" },
    ],
  },
  horse: {
    R: {
      at: [52, -10, 0],
      turn: [0, -40, 0],
      curl: [0, 0.9, 0.9, 0.9],
      splay: [-14, 0, 0, 0],
      thumb: { spread: 40, lift: 0, curl: 0 },
    },
    L: {
      at: [-52, -10, 0],
      turn: [0, 40, 0],
      curl: [0, 0.9, 0.9, 0.9],
      splay: [-14, 0, 0, 0],
      thumb: { spread: 40, lift: 0, curl: 0 },
    },
    rules: [
      {
        kind: "touch",
        a: ["L", 8],
        b: ["R", 8],
        text: "Touch your index fingertips to make a peak",
      },
      {
        kind: "touch",
        a: ["L", 4],
        b: ["R", 4],
        text: "Touch your thumb tips together below",
      },
    ],
  },
  monkey: {
    L: {
      at: [-55, -8, 0],
      turn: [0, 0, -90],
      curl: [0, 0, 0, 0],
      thumb: { spread: 0, lift: 0, curl: 0 },
    },
    R: {
      at: [55, 8, 6],
      turn: [0, 180, 90],
      curl: [0, 0, 0, 0],
      thumb: { spread: 0, lift: 0, curl: 0 },
    },
    rules: [{ kind: "together", text: "Stack your flat hands together" }],
  },
  bird: {
    R: {
      at: [30, 0, 0],
      turn: [0, -90, 5],
      curl: [0.05, 0.05, 0.05, 0.05],
      thumb: { spread: 35, lift: 10, curl: 0 },
    },
    L: {
      at: [-30, 0, 0],
      turn: [0, 90, -5],
      curl: [0.05, 0.05, 0.05, 0.05],
      thumb: { spread: 35, lift: 10, curl: 0 },
    },
    rules: [
      {
        kind: "touch",
        a: ["L", 12],
        b: ["R", 12],
        text: "Touch your fingertips together at the top",
      },
    ],
  },
  dog: {
    R: {
      at: [15, -40, -50],
      turn: [90, 0, 0],
      curl: [1, 1, 1, 1],
      thumb: { spread: 30, lift: 60, curl: 0.5 },
    },
    L: {
      at: [-90, -8, 20],
      turn: [90, 90, 0],
      curl: [0, 0, 0, 0],
      thumb: { spread: 10, lift: 0, curl: 0 },
    },
    rules: [
      {
        kind: "above",
        top: "L",
        text: "Lay your left hand on top of your right fist",
      },
    ],
  },
  boar: {
    R: {
      at: [22, 40, 0],
      turn: [180, 90, 0],
      curl: [0.1, 0.1, 0.1, 0.1],
      thumb: straight,
    },
    L: {
      at: [-22, 40, 0],
      turn: [180, -90, 0],
      curl: [0.1, 0.1, 0.1, 0.1],
      thumb: straight,
    },
    rules: [
      {
        kind: "point-down",
        text: "Bend your wrists so your fingers point down",
      },
      {
        kind: "touch",
        a: ["L", 12],
        b: ["R", 12],
        text: "Touch your fingertips together",
      },
    ],
  },
  rat: {
    R: {
      at: [8, -20, 0],
      turn: [0, -90, 0],
      curl: twoUp,
      thumb: { spread: 5, lift: 50, curl: 0.6 },
    },
    L: {
      at: [-30, 30, 0],
      turn: [0, 90, 0],
      curl: [0.85, 0.85, 0.85, 0.85],
      thumb: { spread: 60, lift: 40, curl: 0.4 },
    },
    rules: [
      {
        kind: "upright",
        side: "R",
        text: "Hold your right index and middle fingers upright",
      },
      {
        kind: "above",
        top: "L",
        text: "Wrap your left hand around your raised right fingers",
      },
    ],
  },
  ox: {
    L: {
      at: [-25, -10, 0],
      turn: [0, 90, 0],
      curl: twoUp,
      thumb: { spread: 5, lift: 50, curl: 0.6 },
    },
    R: {
      at: [50, 55, 20],
      turn: [0, 0, 90],
      curl: twoUp,
      thumb: { spread: 5, lift: 50, curl: 0.6 },
    },
    rules: [
      {
        kind: "upright",
        side: "L",
        text: "Point your left fingers straight up",
      },
      {
        kind: "sideways",
        side: "R",
        text: "Lay your right fingers sideways across them",
      },
    ],
  },
  hare: {
    L: {
      at: [-90, -40, 20],
      turn: [90, 90, 0],
      curl: [0, 0, 0, 0],
      thumb: { spread: 10, lift: 0, curl: 0 },
    },
    R: {
      at: [10, 25, -40],
      turn: [90, 0, 0],
      curl: [0.8, 0.8, 0.8, 0],
      thumb: { spread: 30, lift: 50, curl: 0.5 },
    },
    rules: [
      {
        kind: "above",
        top: "R",
        text: "Rest your right hand on top of your left",
      },
    ],
  },
};
