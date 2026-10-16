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
  "hand_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  "face_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  // Experimental image matcher (?matcher=image); only fetched by the browser when enabled.
  "image_embedder.tflite":
    "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite",
};
const hashes = {
  "hand_landmarker.task":
    "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1",
  "face_landmarker.task":
    "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
  "image_embedder.tflite":
    "bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40",
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const [name, url] of Object.entries(models)) {
  const path = `public/models/${name}`;
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
