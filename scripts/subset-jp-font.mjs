// Downloads Shippori Mincho B1 ExtraBold, subset to the Japanese characters
// used in src/. Rerun after adding new Japanese copy.
import fs from "node:fs/promises";
import path from "node:path";

const output = "public/fonts/jp-800-subset.woff2";
const files = (await fs.readdir("src", { recursive: true })).filter((file) =>
  /\.(tsx?|css)$/.test(file),
);
const chars = new Set();
for (const file of files) {
  const text = await fs.readFile(path.join("src", file), "utf8");
  for (const char of text.match(
    /[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/gu,
  ) ?? [])
    chars.add(char);
}
const text = [...chars].sort().join("");
const css = await fetch(
  `https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@800&text=${encodeURIComponent(text)}`,
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  },
).then((response) => response.text());
const url = css.match(/url\((https:[^)]+)\) format\('woff2'\)/)?.[1];
if (!url) throw new Error(`No woff2 in Google Fonts response:\n${css}`);
const font = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
await fs.writeFile(output, font);
console.log(`${output}: ${chars.size} glyphs, ${font.length} bytes\n${text}`);
