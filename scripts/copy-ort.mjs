// Copies the onnxruntime-web browser files into public/ort so the bulk photo tool can load them
// from our own site (no third-party CDN). Runs on every install (postinstall); output is git-ignored.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/onnxruntime-web/dist";
const to = "public/ort";
const files = ["ort.wasm.min.js", "ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"];

if (!existsSync(from)) {
  console.warn("onnxruntime-web not installed; skipping public/ort");
} else {
  mkdirSync(to, { recursive: true });
  for (const file of files) copyFileSync(`${from}/${file}`, `${to}/${file}`);
  console.log(`Copied ${files.length} onnxruntime-web files to ${to}`);
}
