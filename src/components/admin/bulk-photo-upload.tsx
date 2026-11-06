"use client";

import { unzipSync } from "fflate";
import { ImagePlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { uploadWithProgress } from "@/components/admin/product-images";
import { Badge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { isPhotoFile, matchPhotoFile, orderForUpload, skuIndex, type PhotoMatch } from "@/lib/photo-matching";
import { prepareBackgroundRemover, processPhoto, type PhotoBackground } from "@/lib/photo-processing";
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TIP } from "@/lib/product-images";

type Item = PhotoMatch & {
  key: string;
  file: File;
  originalUrl: string;
  removeBackground: boolean;
  include: boolean;
  status: "waiting" | "processing" | "ready" | "uploading" | "done" | "error";
  processed?: { blob: Blob; url: string };
  progress?: number;
  error?: string;
};

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Unpacks a zip in the browser and returns the photos inside it. */
async function filesFromZip(zip: File): Promise<File[]> {
  const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  return Object.entries(entries)
    .filter(([name, data]) => isPhotoFile(name) && data.length > 0)
    .map(([name, data]) => {
      const extension = name.split(".").pop()!.toLowerCase();
      return new File([new Uint8Array(data)], name.split("/").pop()!, { type: MIME[extension] });
    });
}

export function BulkPhotoUpload({ skus }: { skus: { sku: string; productId: string; productName: string }[] }) {
  const index = useRef(skuIndex(skus)).current;
  const [items, setItems] = useState<Item[]>([]);
  const [background, setBackground] = useState<PhotoBackground>("white");
  const [busy, setBusy] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const queue = useRef(Promise.resolve());

  const patch = (key: string, change: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));

  // Process one photo at a time, in the order they were added, to keep phones responsive.
  const process = (item: Pick<Item, "key" | "file" | "removeBackground">, bg: PhotoBackground) => {
    queue.current = queue.current.then(async () => {
      patch(item.key, { status: "processing", error: undefined });
      try {
        const processed = await processPhoto(item.file, { removeBackground: item.removeBackground, background: bg });
        setItems((current) =>
          current.map((existing) => {
            if (existing.key !== item.key) return existing;
            if (existing.processed) URL.revokeObjectURL(existing.processed.url);
            return { ...existing, processed, status: "ready" };
          }),
        );
      } catch (error) {
        patch(item.key, { status: "error", error: (error as Error).message });
      }
    });
  };

  async function addFiles(list: FileList | File[]) {
    setBusy("Reading files…");
    const files: File[] = [];
    for (const file of [...list]) {
      if (/\.zip$/i.test(file.name) || file.type === "application/zip") {
        try {
          files.push(...(await filesFromZip(file)));
        } catch {
          setBusy("");
          setMessage(`Couldn't open ${file.name}. Is it a .zip file?`);
          return;
        }
      } else if (isPhotoFile(file.name)) files.push(file);
    }
    if (files.some((file) => matchPhotoFile(file.name, index).product)) {
      setBusy("Preparing the background remover (first time only, about 20MB)…");
      await prepareBackgroundRemover().catch(() => undefined);
    }
    setBusy("");
    const added: Item[] = files.map((file, i) => {
      const match = matchPhotoFile(file.name, index);
      return {
        ...match,
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        originalUrl: URL.createObjectURL(file),
        removeBackground: true,
        include: Boolean(match.product) && file.size <= PRODUCT_IMAGE_MAX_BYTES,
        status: "waiting",
        ...(file.size > PRODUCT_IMAGE_MAX_BYTES && { status: "error" as const, error: "Over 10MB" }),
      };
    });
    setItems((current) => [...current, ...added]);
    for (const item of added) if (item.product && item.status === "waiting") process(item, background);
  }

  // Changing the background redoes every matched photo.
  const changeBackground = (bg: PhotoBackground) => {
    setBackground(bg);
    for (const item of items) if (item.product && item.status !== "done") process(item, bg);
  };

  useEffect(
    () => () => {
      for (const item of items) {
        URL.revokeObjectURL(item.originalUrl);
        if (item.processed) URL.revokeObjectURL(item.processed.url);
      }
    },
    // Only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const matched = items.filter((item) => item.product);
  const unmatched = items.filter((item) => !item.product);
  const ready = orderForUpload(matched.filter((item) => item.include && item.status === "ready"));
  const done = matched.filter((item) => item.status === "done").length;

  async function uploadAll() {
    setUploading(true);
    for (const item of ready) {
      patch(item.key, { status: "uploading", progress: 0 });
      try {
        const body = new FormData();
        body.append("file", item.processed!.blob, `${item.sku}.webp`);
        body.append("alt", item.product!.productName);
        await uploadWithProgress(`/admin/api/products/${item.product!.productId}/images`, body, (progress) =>
          patch(item.key, { progress }),
        );
        patch(item.key, { status: "done" });
      } catch (error) {
        patch(item.key, { status: "error", error: (error as Error).message });
      }
    }
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl bg-white p-4">
        <p className="text-sm text-ink">
          Name each photo with the product&apos;s SKU, e.g. <code>ARL-PWD-900.jpg</code>. Extra photos of the same
          product: <code>ARL-PWD-900-1.jpg</code>, <code>ARL-PWD-900-2.jpg</code>. You can also pick one .zip file.
        </p>
        <p className="text-xs text-muted">
          {PRODUCT_IMAGE_TIP} Not sure of a SKU? See the{" "}
          <Link href="/admin/products/photo-checklist" className="underline">
            photo checklist
          </Link>
          .
        </p>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addFiles(event.dataTransfer.files);
          }}
          className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blush-deep p-4 text-center text-sm"
        >
          <ImagePlus aria-hidden="true" className="size-8 text-rose-dark" strokeWidth={1.5} />
          <span className="font-medium text-ink">Choose photos or a .zip</span>
          <span className="text-xs text-muted">Tap to pick from your phone or computer, or drag files here</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.zip,application/zip"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <fieldset className="flex flex-wrap items-center gap-4 text-sm">
          <legend className="sr-only">Background colour</legend>
          <span className="font-medium text-ink">Background:</span>
          {(["white", "blush"] as const).map((value) => (
            <label key={value} className="flex min-h-10 items-center gap-2">
              <input
                type="radio"
                name="background"
                checked={background === value}
                onChange={() => changeBackground(value)}
                className="size-5 accent-ink"
              />
              {value === "white" ? "White" : "Light blush"}
            </label>
          ))}
        </fieldset>
        {(busy || message) && (
          <p role="status" className="text-sm text-ink">
            {busy || message}
          </p>
        )}
      </section>

      {unmatched.length > 0 && (
        <section className="rounded-xl border border-rose-dark bg-white p-4">
          <h2 className="font-sans text-sm font-medium tracking-widest uppercase">
            No product found ({unmatched.length})
          </h2>
          <p className="mt-1 text-xs text-muted">Rename these to a product&apos;s SKU and add them again.</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {unmatched.map((item) => (
              <li key={item.key} className="rounded bg-blush px-2 py-1">
                {item.file.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {matched.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-sm font-medium tracking-widest uppercase">
              Preview ({matched.length}){done > 0 && ` · ${done} uploaded`}
            </h2>
            <Button type="button" size="lg" variant="rose" disabled={uploading || ready.length === 0} onClick={uploadAll}>
              {uploading ? "Uploading…" : `Upload ${ready.length} photo${ready.length === 1 ? "" : "s"}`}
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matched.map((item) => (
              <li key={item.key} className="flex flex-col gap-2 rounded-xl bg-white p-3">
                <div>
                  <p className="truncate text-sm font-medium text-ink">{item.product!.productName}</p>
                  <p className="text-xs text-muted">
                    {item.sku}
                    {item.index > 0 && ` · extra photo ${item.index}`} · {item.file.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <figure className="flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved file */}
                    <img src={item.originalUrl} alt="" className="aspect-square w-full rounded-lg bg-blush object-contain" />
                    <figcaption className="text-center text-xs text-muted">Before</figcaption>
                  </figure>
                  <figure className="flex flex-col gap-1">
                    {item.processed ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved file
                      <img src={item.processed.url} alt="" className="aspect-square w-full rounded-lg border border-blush-deep object-contain" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-blush text-xs text-muted">
                        {item.status === "error" ? "Couldn't process" : "Working…"}
                      </div>
                    )}
                    <figcaption className="text-center text-xs text-muted">After</figcaption>
                  </figure>
                </div>
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.removeBackground}
                    disabled={item.status === "uploading" || item.status === "done"}
                    onChange={(event) => {
                      const next = { ...item, removeBackground: event.target.checked };
                      patch(item.key, { removeBackground: event.target.checked });
                      process(next, background);
                    }}
                    className="size-5 accent-ink"
                  />
                  Remove background
                </label>
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.include}
                    disabled={item.status === "uploading" || item.status === "done"}
                    onChange={(event) => patch(item.key, { include: event.target.checked })}
                    className="size-5 accent-ink"
                  />
                  Upload this photo
                </label>
                <div className="flex flex-wrap gap-1">
                  {item.status === "done" && <Badge tone="gold">Uploaded</Badge>}
                  {item.status === "uploading" && <Badge>Uploading {item.progress ?? 0}%</Badge>}
                  {item.status === "processing" && <Badge>Processing…</Badge>}
                  {item.status === "error" && (
                    <p role="alert" className="border-l-2 border-rose-dark pl-2 text-xs text-ink">
                      {item.error}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
