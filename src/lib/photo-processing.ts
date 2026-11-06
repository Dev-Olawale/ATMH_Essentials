"use client";

/**
 * Product photo clean-up in the browser, for the bulk photo upload:
 * 1. Background removal with the U²-Net "u2netp" model (Apache-2.0) on onnxruntime-web (MIT).
 *    Both are served from this site (/models, /ort); nothing is sent to a third party.
 * 2. Crop to the product, centre it on a square canvas with even padding and a white or
 *    blush background, at most 1600px, as WebP.
 */

const MODEL_URL = "/models/u2netp.onnx";
const ORT_URL = "/ort/ort.wasm.min.js";
const MODEL_SIZE = 320;
export const OUTPUT_SIZE = 1600;
/** Space around the product, as a share of each side. */
const PADDING = 0.08;
/** Mask values above this count as "product" when cropping. */
const CROP_THRESHOLD = 0.2;
/**
 * The model is unsure about thin or dark parts (bottle caps, pump tops) and returns middling
 * values there, which would make them see-through. This curve makes "fairly sure" solid,
 * "fairly sure not" clear, and keeps a soft edge in between.
 */
const MASK_LOW = 0.12;
const MASK_HIGH = 0.45;
function firmUp(value: number): number {
  const t = Math.min(1, Math.max(0, (value - MASK_LOW) / (MASK_HIGH - MASK_LOW)));
  return t * t * (3 - 2 * t);
}

type Ort = typeof import("onnxruntime-web");
type Session = import("onnxruntime-web").InferenceSession;

let ortPromise: Promise<Ort> | null = null;
let sessionPromise: Promise<Session> | null = null;

/** Loads onnxruntime-web from our own /ort folder (copied there on install). */
function loadOrt(): Promise<Ort> {
  ortPromise ??= new Promise<Ort>((resolve, reject) => {
    const existing = (window as unknown as { ort?: Ort }).ort;
    if (existing) return resolve(existing);
    const script = document.createElement("script");
    script.src = ORT_URL;
    script.onload = () => {
      const ort = (window as unknown as { ort: Ort }).ort;
      ort.env.wasm.wasmPaths = "/ort/";
      // Single-threaded: works without cross-origin isolation headers, fine for one image at a time.
      ort.env.wasm.numThreads = 1;
      resolve(ort);
    };
    script.onerror = () => reject(new Error("Couldn't load the background remover."));
    document.head.appendChild(script);
  });
  return ortPromise;
}

/** Downloads the model once (about 4.5MB, cached by the browser). */
export function prepareBackgroundRemover(): Promise<Session> {
  sessionPromise ??= loadOrt().then((ort) =>
    ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] }),
  );
  return sessionPromise;
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return { element, context: element.getContext("2d", { willReadFrequently: true })! };
}

/** A 0–1 "how much is this pixel the product" mask, at model resolution. */
async function predictMask(source: HTMLCanvasElement): Promise<Float32Array> {
  const [ort, session] = await Promise.all([loadOrt(), prepareBackgroundRemover()]);
  const small = canvas(MODEL_SIZE, MODEL_SIZE);
  small.context.drawImage(source, 0, 0, MODEL_SIZE, MODEL_SIZE);
  const pixels = small.context.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;

  // The model expects ImageNet-normalised RGB in channel-first order.
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const area = MODEL_SIZE * MODEL_SIZE;
  const input = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    for (let c = 0; c < 3; c++) input[c * area + i] = (pixels[i * 4 + c] / 255 - mean[c]) / std[c];
  }
  const outputs = await session.run({
    [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, MODEL_SIZE, MODEL_SIZE]),
  });
  const raw = outputs[session.outputNames[0]].data as Float32Array;
  let min = Infinity;
  let max = -Infinity;
  for (const value of raw) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const range = max - min || 1;
  return raw.map((value) => firmUp((value - min) / range));
}

export type PhotoBackground = "white" | "blush";

function backgroundColour(background: PhotoBackground): string {
  if (background === "white") return "white";
  // The brand blush, read from the theme so it always matches the store.
  return getComputedStyle(document.documentElement).getPropertyValue("--blush").trim() || "white";
}

export type ProcessedPhoto = { blob: Blob; url: string };

/**
 * Cleans up one product photo. With removeBackground off, the photo is still squared up,
 * centred and padded on the chosen background, so every product tile looks the same.
 */
export async function processPhoto(
  file: Blob,
  options: { removeBackground: boolean; background: PhotoBackground },
): Promise<ProcessedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("This file isn't a photo the browser can read (try JPG or PNG).");
  });
  // Work at up to 2000px to keep memory in check on phones.
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const work = canvas(width, height);
  work.context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Bounding box of the product (the whole photo when the background is kept).
  let box = { x: 0, y: 0, w: width, h: height };
  if (options.removeBackground) {
    const mask = await predictMask(work.element);
    // Scale the mask up to the photo with smoothing, then use it as transparency.
    const maskSmall = canvas(MODEL_SIZE, MODEL_SIZE);
    const maskPixels = maskSmall.context.createImageData(MODEL_SIZE, MODEL_SIZE);
    for (let i = 0; i < mask.length; i++) maskPixels.data[i * 4 + 3] = Math.round(mask[i] * 255);
    maskSmall.context.putImageData(maskPixels, 0, 0);
    const maskFull = canvas(width, height);
    maskFull.context.drawImage(maskSmall.element, 0, 0, width, height);
    const alpha = maskFull.context.getImageData(0, 0, width, height).data;
    const image = work.context.getImageData(0, 0, width, height);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = alpha[i + 3];
        image.data[i + 3] = a;
        if (a > CROP_THRESHOLD * 255) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    work.context.putImageData(image, 0, 0);
    // If nothing stood out, keep the whole frame rather than an empty square.
    if (maxX >= minX && maxY >= minY) box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  const output = canvas(OUTPUT_SIZE, OUTPUT_SIZE);
  output.context.fillStyle = backgroundColour(options.background);
  output.context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const space = OUTPUT_SIZE * (1 - 2 * PADDING);
  // Fit inside the padded square; small photos are enlarged at most 2x to avoid blur.
  const fit = Math.min(space / box.w, space / box.h, 2);
  const drawW = box.w * fit;
  const drawH = box.h * fit;
  output.context.imageSmoothingQuality = "high";
  output.context.drawImage(
    work.element,
    box.x,
    box.y,
    box.w,
    box.h,
    (OUTPUT_SIZE - drawW) / 2,
    (OUTPUT_SIZE - drawH) / 2,
    drawW,
    drawH,
  );

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => output.element.toBlob(resolve, type, quality));
  const blob = (await encode("image/webp", 0.88).then((b) => (b?.type === "image/webp" ? b : null))) ?? (await encode("image/jpeg", 0.9));
  if (!blob) throw new Error("Couldn't save the processed photo.");
  return { blob, url: URL.createObjectURL(blob) };
}
