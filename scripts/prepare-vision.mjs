import {
  mkdir,
  copyFile,
  readdir,
  writeFile,
  readFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";

await mkdir("public/vision", { recursive: true });
await mkdir("public/models", { recursive: true });
for (const file of await readdir("node_modules/@mediapipe/tasks-vision/wasm")) {
  if (file.endsWith(".js") || file.endsWith(".wasm"))
    await copyFile(
      `node_modules/@mediapipe/tasks-vision/wasm/${file}`,
      `public/vision/${file}`,
    );
}
const models = {
  hand_landmarker:
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  face_landmarker:
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
};
const hashes = {
  hand_landmarker:
    "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1",
  face_landmarker:
    "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const [name, url] of Object.entries(models)) {
  const path = `public/models/${name}.task`;
  try {
    if (sha(await readFile(path)) === hashes[name]) continue;
  } catch {}
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha(bytes) !== hashes[name])
    throw new Error(`${name}: unexpected asset checksum`);
  await writeFile(path, bytes);
  console.log(
    `${name}: ${bytes.length} bytes, sha256 ${sha(bytes)}`,
  );
}
