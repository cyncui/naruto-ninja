// Simplified hand-seal guidance, paraphrased from the twelve-seal databook
// chart reproduced on Narutopedia's Hand Seal page. Diagrams are schematics
// from the performer's point of view, not traced artwork.
export const sealGuideSource = "https://naruto.fandom.com/wiki/Hand_Seal";

type Finger = "up" | "curl";
type Thumb = "up" | "in" | "cross" | "down" | "out" | "raise";
export interface HandSpec {
  side: "L" | "R";
  x: number;
  y: number;
  rotate?: number;
  fingers: [Finger, Finger, Finger, Finger];
  thumb: Thumb;
  /** Extra tilt per finger (index, middle, ring, little), degrees. */
  tilt?: [number, number, number, number];
  focus?: ("thumb" | "index" | "middle" | "ring" | "little")[];
}
export interface Callout {
  at: [number, number];
  side: "left" | "right";
  text: string;
}
export interface SealGuide {
  how: string;
  hands: HandSpec[];
  callouts: Callout[];
}

const up4: [Finger, Finger, Finger, Finger] = ["up", "up", "up", "up"];
const fist: [Finger, Finger, Finger, Finger] = ["curl", "curl", "curl", "curl"];
const twoUp: [Finger, Finger, Finger, Finger] = ["up", "up", "curl", "curl"];

export const sealGuides: Record<string, SealGuide> = {
  rat: {
    how: "Raise the index and middle fingers of your right hand. Wrap your left hand around them, left thumb on the outside.",
    hands: [
      {
        side: "R",
        x: 0,
        y: 34,
        fingers: twoUp,
        thumb: "in",
        focus: ["index", "middle"],
      },
      {
        side: "L",
        x: 4,
        y: 4,
        fingers: fist,
        thumb: "cross",
        focus: ["thumb"],
      },
    ],
    callouts: [
      { at: [-6, -56], side: "right", text: "R index + middle up" },
      { at: [-14, -22], side: "left", text: "L hand wraps them" },
      { at: [12, -20], side: "right", text: "L thumb outside" },
    ],
  },
  ox: {
    how: "Extend the index and middle fingers of both hands. Hold the left pair vertical and lay the right pair horizontally across it.",
    hands: [
      {
        side: "L",
        x: -14,
        y: 40,
        fingers: twoUp,
        thumb: "in",
        focus: ["index", "middle"],
      },
      {
        side: "R",
        x: 32,
        y: -16,
        rotate: -90,
        fingers: twoUp,
        thumb: "in",
        focus: ["index", "middle"],
      },
    ],
    callouts: [
      { at: [-10, -42], side: "left", text: "L fingers vertical" },
      { at: [-30, -8], side: "left", text: "R fingers horizontal, across" },
    ],
  },
  tiger: {
    how: "Interlace your ring and little fingers. Press both index and middle fingers together pointing up, with both thumbs straight up.",
    hands: [
      {
        side: "L",
        x: -10,
        y: 34,
        fingers: twoUp,
        thumb: "raise",
        tilt: [3, 2, 0, 0],
        focus: ["index", "middle", "thumb"],
      },
      {
        side: "R",
        x: 10,
        y: 34,
        fingers: twoUp,
        thumb: "raise",
        tilt: [-3, -2, 0, 0],
        focus: ["index", "middle", "thumb"],
      },
    ],
    callouts: [
      { at: [0, -42], side: "right", text: "Index + middle together, up" },
      { at: [-2, 4], side: "left", text: "Thumbs straight up" },
      { at: [12, -10], side: "right", text: "Ring + little interlaced" },
    ],
  },
  hare: {
    how: "Hold your left hand flat. Rest your right hand on it with every finger gently curled except the little finger, which stays straight.",
    hands: [
      { side: "L", x: -30, y: 26, rotate: 90, fingers: up4, thumb: "up" },
      {
        side: "R",
        x: 6,
        y: 18,
        fingers: ["curl", "curl", "curl", "up"],
        thumb: "in",
        focus: ["little"],
      },
    ],
    callouts: [
      { at: [19, -46], side: "right", text: "R little finger straight" },
      { at: [-4, -26], side: "left", text: "Other R fingers curled" },
      { at: [30, 34], side: "right", text: "L hand flat below" },
    ],
  },
  dragon: {
    how: "Interlock your fingers and press the hands together. Point both thumbs down where they meet, left thumb on top.",
    hands: [
      {
        side: "R",
        x: 10,
        y: 20,
        fingers: fist,
        thumb: "down",
        focus: ["thumb"],
      },
      {
        side: "L",
        x: -10,
        y: 20,
        fingers: fist,
        thumb: "down",
        focus: ["thumb"],
      },
    ],
    callouts: [
      { at: [0, -26], side: "right", text: "Fingers interlocked" },
      { at: [-4, 26], side: "left", text: "Thumbs point down, L on top" },
    ],
  },
  snake: {
    how: "Clasp your hands with the fingers interlocked and palms pressed together. Cross your left thumb over the outside of the right.",
    hands: [
      { side: "R", x: 10, y: 34, fingers: fist, thumb: "up" },
      {
        side: "L",
        x: -10,
        y: 34,
        fingers: fist,
        thumb: "cross",
        focus: ["thumb"],
      },
    ],
    callouts: [
      { at: [0, -12], side: "right", text: "Fingers interlocked" },
      { at: [-24, 10], side: "left", text: "Palms pressed together" },
      { at: [6, -6], side: "left", text: "L thumb outside" },
    ],
  },
  horse: {
    how: "Curl the middle, ring and little fingers. Touch the tips of both index fingers to form a peak, thumbs touching below. Keep your elbows out.",
    hands: [
      {
        side: "L",
        x: -22,
        y: 34,
        fingers: ["up", "curl", "curl", "curl"],
        thumb: "in",
        tilt: [-17, 0, 0, 0],
        focus: ["index"],
      },
      {
        side: "R",
        x: 22,
        y: 34,
        fingers: ["up", "curl", "curl", "curl"],
        thumb: "in",
        tilt: [-17, 0, 0, 0],
        focus: ["index"],
      },
    ],
    callouts: [
      { at: [0, -38], side: "right", text: "Index tips form a peak" },
      { at: [-20, -6], side: "left", text: "Other fingers curled" },
      { at: [40, 14], side: "right", text: "Elbows out" },
    ],
  },
  ram: {
    how: "Hold your hands together vertically with both index and middle fingers raised. Fold the rest, left thumb across the top.",
    hands: [
      {
        side: "R",
        x: 10,
        y: 34,
        fingers: twoUp,
        thumb: "up",
        tilt: [-3, -2, 0, 0],
        focus: ["index", "middle"],
      },
      {
        side: "L",
        x: -10,
        y: 34,
        fingers: twoUp,
        thumb: "cross",
        tilt: [3, 2, 0, 0],
        focus: ["index", "middle", "thumb"],
      },
    ],
    callouts: [
      { at: [0, -42], side: "right", text: "Index + middle up" },
      { at: [8, -10], side: "left", text: "L thumb on top" },
    ],
  },
  monkey: {
    how: "Hold both hands flat and horizontal, stacked with fingers pointing opposite ways. Lay each thumb flat along the other hand's little finger.",
    hands: [
      { side: "L", x: -34, y: 6, rotate: 90, fingers: up4, thumb: "in" },
      {
        side: "R",
        x: 34,
        y: -6,
        rotate: -90,
        fingers: up4,
        thumb: "in",
        focus: ["thumb"],
      },
    ],
    callouts: [
      { at: [-10, -26], side: "left", text: "Hands flat, stacked" },
      { at: [18, 10], side: "right", text: "Thumbs flat on little fingers" },
    ],
  },
  bird: {
    how: "Bring your hands together with the fingertips touching and pointing up, palms slightly apart. Mind the angle of your thumbs.",
    hands: [
      {
        side: "L",
        x: -20,
        y: 36,
        rotate: 10,
        fingers: up4,
        thumb: "out",
        focus: ["index", "middle"],
      },
      {
        side: "R",
        x: 20,
        y: 36,
        rotate: -10,
        fingers: up4,
        thumb: "out",
        focus: ["index", "middle"],
      },
    ],
    callouts: [
      { at: [0, -50], side: "right", text: "Fingertips touch" },
      { at: [0, 6], side: "right", text: "Palms apart" },
      { at: [-38, 0], side: "left", text: "Watch thumb angle" },
    ],
  },
  dog: {
    how: "Make a fist with your right hand. Lay your left hand flat on top of it, palm down.",
    hands: [
      { side: "R", x: 6, y: 44, fingers: fist, thumb: "in" },
      {
        side: "L",
        x: -30,
        y: -2,
        rotate: 90,
        fingers: up4,
        thumb: "in",
        focus: ["index", "middle", "ring", "little"],
      },
    ],
    callouts: [
      { at: [40, -12], side: "right", text: "L hand flat, palm down" },
      { at: [-8, 26], side: "left", text: "R fist below" },
    ],
  },
  boar: {
    how: "Bend your wrists so both hands point down, palms facing each other, with the fingertips touching.",
    hands: [
      {
        side: "L",
        x: -22,
        y: -34,
        rotate: 172,
        fingers: up4,
        thumb: "up",
        focus: ["index", "middle", "ring", "little"],
      },
      {
        side: "R",
        x: 22,
        y: -34,
        rotate: -172,
        fingers: up4,
        thumb: "up",
        focus: ["index", "middle", "ring", "little"],
      },
    ],
    callouts: [
      { at: [-26, -46], side: "left", text: "Bend wrists" },
      { at: [0, 46], side: "right", text: "Fingers down, tips touch" },
    ],
  },
};
