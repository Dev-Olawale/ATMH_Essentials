import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PrintButton } from "@/components/admin/print-button";
import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getPhotoChecklist } from "@/lib/admin/photo-checklist";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Photo checklist" };

async function Checklist({ searchParams }: { searchParams: PageProps<"/admin/products/photo-checklist">["searchParams"] }) {
  await requireAdminPage();
  const missing = (await searchParams).missing === "1";
  const rows = await getPhotoChecklist(missing);
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <PrintButton />
        <a href={`/admin/api/products/photo-checklist${missing ? "?missing=1" : ""}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
          Download CSV
        </a>
        <Link
          href={missing ? "/admin/products/photo-checklist" : "/admin/products/photo-checklist?missing=1"}
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          {missing ? "Show all products" : "Only products without photos"}
        </Link>
      </div>
      <p className="mb-3 text-sm text-ink">
        {rows.length} products. Save each photo as the file name shown; extra photos of the same product end in -1, -2.
      </p>
      <div className="overflow-x-auto rounded-xl bg-white print:overflow-visible">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-blush text-xs text-muted">
            <tr>
              <th className="p-2">Done</th>
              <th className="p-2">Product</th>
              <th className="p-2">File name</th>
              <th className="p-2">Photos now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.sku} className="border-t border-blush-deep break-inside-avoid">
                <td className="p-2">
                  <span aria-hidden="true" className="inline-block size-4 border border-ink" />
                </td>
                <td className="p-2">
                  {(index === 0 || rows[index - 1].category !== row.category) && (
                    <span className="block text-xs tracking-widest text-muted uppercase">{row.category}</span>
                  )}
                  {row.product}
                  <span className="block text-xs text-muted">{row.options}</span>
                </td>
                <td className="p-2 font-mono text-xs">{row.sku}.jpg</td>
                <td className="p-2">{row.photos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PhotoChecklistPage(props: PageProps<"/admin/products/photo-checklist">) {
  return (
    <>
      <PageHeader title="Photo checklist" description="For whoever takes the product photos." />
      <Suspense fallback={<AdminLoading />}>
        <Checklist {...props} />
      </Suspense>
    </>
  );
}
