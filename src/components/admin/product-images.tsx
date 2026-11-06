"use client";

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteImage, moveImage, updateImageAlt } from "@/app/admin/actions/images";
import { inputClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_EDGE,
  PRODUCT_IMAGE_TIP,
} from "@/lib/product-images";

type Upload = { key: string; name: string; progress: number; error?: string; done?: boolean };

/**
 * Shrinks a photo in the browser so large phone pictures upload quickly on mobile data.
 * Falls back to JPEG where the browser cannot encode WebP. The server re-encodes to WebP anyway.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, PRODUCT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await encode("image/webp", 0.85);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", 0.9);
  if (!jpeg) throw new Error("encode failed");
  return jpeg;
}

/** POSTs a photo with upload progress (fetch can't report it). Shared with the bulk upload. */
export function uploadWithProgress(url: string, body: FormData, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = "Upload failed. Try again.";
      try {
        message = JSON.parse(xhr.responseText).error ?? message;
      } catch {
        if (xhr.status === 413) message = "Photo is too large to upload.";
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("No connection. Check your internet and try again."));
    xhr.send(body);
  });
}

export function ProductImages({
  productId,
  productName,
  images,
}: {
  productId: string;
  productName: string;
  images: { id: string; url: string; alt: string }[];
}) {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const patch = (key: string, change: Partial<Upload>) =>
    setUploads((current) => current.map((upload) => (upload.key === key ? { ...upload, ...change } : upload)));

  async function addFiles(files: FileList | File[]) {
    const list = [...files];
    const queued = list.map((file, index) => ({
      key: `${Date.now()}-${index}`,
      name: file.name,
      progress: 0,
      ...(!file.type.startsWith("image/")
        ? { error: "Not a photo." }
        : file.size > PRODUCT_IMAGE_MAX_BYTES
          ? { error: "Over 10MB. Choose a smaller photo." }
          : {}),
    }));
    setUploads((current) => [...current.filter((upload) => !upload.done), ...queued]);

    // One at a time keeps mobile connections from stalling.
    for (const [index, file] of list.entries()) {
      const { key, error } = queued[index];
      if (error) continue;
      try {
        let blob: Blob = file;
        try {
          blob = await shrink(file);
        } catch {
          // Unusual formats (e.g. HEIC outside Safari): let the server try the original.
        }
        const body = new FormData();
        body.append("file", blob, file.name.replace(/\.[^.]+$/, "") + (blob.type === "image/webp" ? ".webp" : ".jpg"));
        body.append("alt", productName);
        await uploadWithProgress(`/admin/api/products/${productId}/images`, body, (progress) => patch(key, { progress }));
        patch(key, { progress: 100, done: true });
      } catch (uploadError) {
        patch(key, { error: (uploadError as Error).message });
      }
    }
    router.refresh();
  }

  const run = (task: () => Promise<void>) =>
    startTransition(async () => {
      await task();
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-4">
      <div>
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Photos</h2>
        <p className="text-xs text-muted">
          {PRODUCT_IMAGE_TIP} The first photo is the main one. Up to 10MB each; we resize them for you.
        </p>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-sm ${
          dragging ? "border-ink bg-blush" : "border-blush-deep"
        }`}
      >
        <ImagePlus aria-hidden="true" className="size-8 text-rose-dark" strokeWidth={1.5} />
        <span className="font-medium text-ink">Add photos</span>
        <span className="text-xs text-muted">Tap to choose from your phone, or drag photos here</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {uploads.map((upload) => (
            <li key={upload.key} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{upload.name}</span>
                <span className={upload.error ? "font-medium text-ink" : "text-muted"}>
                  {upload.error ?? (upload.done ? "Done" : `${upload.progress}%`)}
                </span>
              </div>
              {!upload.error && (
                <progress value={upload.progress} max={100} className="h-1.5 w-full accent-ink" aria-label={`Uploading ${upload.name}`} />
              )}
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <li key={image.id} className="flex gap-3 rounded-lg border border-blush-deep p-2">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-blush-deep">
                <Image src={image.url} alt={image.alt} fill sizes="6rem" className="object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 text-[0.625rem] text-white">Main</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <label className="text-xs text-muted" htmlFor={`alt-${image.id}`}>
                  Description for screen readers and Google
                </label>
                <input
                  id={`alt-${image.id}`}
                  defaultValue={image.alt}
                  onBlur={(event) => {
                    if (event.target.value !== image.alt) {
                      const value = event.target.value;
                      run(() => updateImageAlt(image.id, value));
                    }
                  }}
                  className={`${inputClass} h-10 text-sm`}
                />
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move earlier"
                    disabled={busy || index === 0}
                    onClick={() => run(() => moveImage(image.id, "up"))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move later"
                    disabled={busy || index === images.length - 1}
                    onClick={() => run(() => moveImage(image.id, "down"))}
                  >
                    <ArrowDown />
                  </Button>
                  {confirmDelete === image.id ? (
                    <>
                      <Button type="button" size="sm" disabled={busy} onClick={() => run(() => deleteImage(image.id))}>
                        Delete photo
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete photo"
                      onClick={() => setConfirmDelete(image.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
