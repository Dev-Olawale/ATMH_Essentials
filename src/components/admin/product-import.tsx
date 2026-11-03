"use client";

import { useState, useTransition } from "react";

import {
  applyProductImport,
  previewProductImport,
  type ImportPreview,
  type ImportResult,
} from "@/app/admin/actions/import";
import { Badge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";

export function ProductImport() {
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function choose(file: File | undefined) {
    setPreview(null);
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    const content = await file.text();
    setText(content);
    startTransition(async () => setPreview(await previewProductImport(content)));
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-4">
      <div>
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Import</h2>
        <p className="text-xs text-muted">
          Choose a CSV file. Nothing changes until you check the preview and press Import. Products are matched by
          product_slug and options by variant_sku; blank optional cells keep what is already saved.
        </p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-ink px-4 text-sm text-ink">
        {fileName ? `Chosen: ${fileName}` : "Choose CSV file"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {pending && !preview && <p className="text-sm text-muted">Checking the file…</p>}

      {result && (
        <div role="status" className={`rounded-lg p-3 text-sm ${result.ok ? "bg-blush-deep" : "border border-rose-dark bg-blush"}`}>
          {result.message}
        </div>
      )}

      {preview && !result?.ok && (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[
              ["New products", preview.summary.productsNew],
              ["Updated products", preview.summary.productsUpdated],
              ["New options", preview.summary.variantsNew],
              ["Updated options", preview.summary.variantsUpdated],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-blush p-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-xl font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {preview.errors.length > 0 && (
            <div role="alert" className="rounded-lg border border-rose-dark bg-blush p-3 text-sm">
              <p className="font-medium text-ink">
                {preview.blocking ? "Fix these in your file, then choose it again:" : "Warnings:"}
              </p>
              <ul className="mt-1 max-h-64 list-disc overflow-y-auto pl-5">
                {preview.errors.map((issue, index) => (
                  <li key={index}>
                    Line {issue.line}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-blush-deep">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="bg-blush text-xs text-muted">
                  <tr>
                    <th className="p-2">Line</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Option</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.flatMap((row) =>
                    row.variants.map((variant, index) => (
                      <tr key={variant.sku} className="border-t border-blush-deep">
                        <td className="p-2 text-muted">{index === 0 ? row.line : ""}</td>
                        <td className="p-2">
                          {index === 0 && (
                            <span className="flex flex-wrap items-center gap-1">
                              {row.name} {row.isNew ? <Badge tone="gold">New</Badge> : <Badge>Update</Badge>}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {variant.label} <span className="text-xs text-muted">{variant.sku}</span>
                        </td>
                        <td className="p-2">{formatNaira(variant.priceKobo)}</td>
                        <td className="p-2">{variant.stockQty}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="self-start"
            disabled={pending || preview.blocking || preview.rows.length === 0}
            onClick={() =>
              startTransition(async () => {
                const outcome = await applyProductImport(text);
                setResult(outcome);
                if (!outcome.ok && outcome.errors) {
                  setPreview({ ...preview, errors: outcome.errors, blocking: true });
                }
              })
            }
          >
            {pending ? "Importing…" : "Import"}
          </Button>
        </>
      )}
    </section>
  );
}
