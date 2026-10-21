export const glyphs: Record<string, string> = {
  rat: "子",
  ox: "丑",
  tiger: "寅",
  hare: "卯",
  dragon: "辰",
  snake: "巳",
  horse: "午",
  ram: "未",
  monkey: "申",
  bird: "酉",
  dog: "戌",
  boar: "亥",
};
export const glyphFor = (id: string) => glyphs[id] ?? "印";
