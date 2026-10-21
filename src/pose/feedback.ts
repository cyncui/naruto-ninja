import { bends, FINGERS, handPoints, landmarkVecs } from "./hand.ts";
import type { Digit, Point3, Side, Vec } from "./hand.ts";
import { sealPoses } from "./seals.ts";
import type { Rule } from "./seals.ts";

export interface Issue {
  key: string;
  text: string;
  /** Digits to mark on the model, as "L:index". */
  digits: string[];
}
export interface PoseCheck {
  state: "no-hands" | "one-hand" | "ok" | "issues";
  issues: Issue[];
}

const sideName: Record<Side, string> = { L: "left", R: "right" };
const tipDigit: Record<number, Digit> = {
  4: "thumb",
  8: "index",
  12: "middle",
  16: "ring",
  20: "little",
};
// Interlocked seals hide fingers, so their estimates are noisier.
const hidden = new Set(["snake", "dragon", "monkey"]);
const join = (names: string[]) =>
  names.length < 2
    ? names[0]
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** "index finger", "ring and little fingers", "index finger and thumb". */
function describe(digits: Digit[]) {
  const fingers = digits.filter((d) => d !== "thumb");
  const parts = fingers.length
    ? [`${join(fingers)} finger${fingers.length > 1 ? "s" : ""}`]
    : [];
  if (digits.includes("thumb")) parts.push("thumb");
  return parts.join(" and ");
}

const targets = new Map<string, Record<Side, Record<Digit, number>>>();
/** Bends of the reference model, measured exactly as the camera is. */
function targetBends(sealId: string) {
  let cached = targets.get(sealId);
  if (!cached) {
    const seal = sealPoses[sealId];
    cached = {
      L: bends(handPoints("L", seal.L)),
      R: bends(handPoints("R", seal.R)),
    };
    targets.set(sealId, cached);
  }
  return cached;
}

const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const centre = (points: Vec[]): Vec => {
  const sum = points.reduce<Vec>(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0],
  );
  return [
    sum[0] / points.length,
    sum[1] / points.length,
    sum[2] / points.length,
  ];
};

function ruleHolds(rule: Rule, hand: Record<Side, Vec[]>, palm: number) {
  // Image coordinates: y grows downward.
  switch (rule.kind) {
    case "touch":
      return (
        distance(hand[rule.a[0]][rule.a[1]], hand[rule.b[0]][rule.b[1]]) <
        palm * 0.5
      );
    case "together":
      return distance(hand.L[0], hand.R[0]) < palm * 1.4;
    case "above": {
      const other: Side = rule.top === "L" ? "R" : "L";
      return centre(hand[rule.top])[1] < centre(hand[other])[1] - palm * 0.1;
    }
    case "point-down":
      return (["L", "R"] as Side[]).every(
        (side) =>
          centre([8, 12, 16, 20].map((i) => hand[side][i]))[1] >
          hand[side][0][1],
      );
    case "upright": {
      const [dx, dy] = [0, 1].map(
        (k) => hand[rule.side][8][k] - hand[rule.side][5][k],
      );
      return dy < 0 && Math.abs(dy) > Math.abs(dx) * 1.5;
    }
    case "sideways": {
      const [dx, dy] = [0, 1].map(
        (k) => hand[rule.side][8][k] - hand[rule.side][5][k],
      );
      return Math.abs(dx) > Math.abs(dy) * 1.5;
    }
    case "thumbs-down":
      return (["L", "R"] as Side[]).every(
        (side) => hand[side][4][1] > hand[side][2][1],
      );
  }
}

function ruleDigits(rule: Rule): string[] {
  if (rule.kind === "touch")
    return [rule.a, rule.b].map(
      ([side, i]) => `${side}:${tipDigit[i] ?? "index"}`,
    );
  if (rule.kind === "upright" || rule.kind === "sideways")
    return [`${rule.side}:index`, `${rule.side}:middle`];
  if (rule.kind === "thumbs-down") return ["L:thumb", "R:thumb"];
  return [];
}

/**
 * Compare camera landmarks with a seal's reference pose and say what to fix.
 * Landmarks come from the unmirrored camera image, where the performer's
 * left hand appears on the right.
 */
export function checkPose(
  sealId: string,
  hands: Point3[][],
  aspect: number,
): PoseCheck | null {
  const seal = sealPoses[sealId];
  if (!seal) return null;
  if (!hands.length)
    return {
      state: "no-hands",
      issues: [
        { key: "hands", text: "Show both hands to the camera", digits: [] },
      ],
    };
  if (hands.length === 1)
    return {
      state: "one-hand",
      issues: [
        {
          key: "one-hand",
          text: "The camera sees your hands as one. Ease them apart slightly so it can check each finger.",
          digits: [],
        },
      ],
    };
  const [first, second] = hands.map((h) => landmarkVecs(h, aspect));
  const hand: Record<Side, Vec[]> =
    first[0][0] > second[0][0]
      ? { L: first, R: second }
      : { L: second, R: first };
  const palm =
    (distance(hand.L[0], hand.L[9]) + distance(hand.R[0], hand.R[9])) / 2;

  const issues: Issue[] = [];
  for (const rule of seal.rules)
    if (!ruleHolds(rule, hand, palm))
      issues.push({
        key: `rule:${rule.kind}:${rule.text}`,
        text: rule.text,
        digits: ruleDigits(rule),
      });

  const target = targetBends(sealId);
  const tolerance = hidden.has(sealId) ? 0.42 : 0.33;
  for (const side of ["L", "R"] as Side[]) {
    const measured = bends(hand[side]);
    const fix: Record<"Straighten" | "Curl", Digit[]> = {
      Straighten: [],
      Curl: [],
    };
    for (const digit of [...FINGERS, "thumb"] as Digit[]) {
      const want = target[side][digit];
      const got = measured[digit];
      if (want < 0.3 && got > want + tolerance) fix.Straighten.push(digit);
      else if (want > 0.55 && got < want - tolerance) fix.Curl.push(digit);
    }
    for (const verb of ["Straighten", "Curl"] as const) {
      const digits = fix[verb];
      if (!digits.length) continue;
      issues.push({
        key: `${side}:${verb}:${digits.join(",")}`,
        text: `${verb} your ${sideName[side]} ${describe(digits)}`,
        digits: digits.map((d) => `${side}:${d}`),
      });
    }
  }
  return { state: issues.length ? "issues" : "ok", issues };
}

/** Equal enough that the on-screen corrections would not change. */
export const samePoseCheck = (a: PoseCheck | null, b: PoseCheck | null) =>
  a?.state === b?.state &&
  (a?.issues.map((i) => i.key).join("|") ?? "") ===
    (b?.issues.map((i) => i.key).join("|") ?? "");
