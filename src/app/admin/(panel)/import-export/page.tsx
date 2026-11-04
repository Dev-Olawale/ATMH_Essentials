import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { ProductImport } from "@/components/admin/product-import";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Import / export" };

async function ImportExport() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl bg-white p-4">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Export</h2>
        <p className="text-xs text-muted">
          Download every product as a spreadsheet (one row per option). Edit it in Excel or Google Sheets and import it
          back to update prices and stock in bulk.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/api/products/export" className={buttonVariants({ size: "lg" })}>
            Download products CSV
          </a>
          <a href="/templates/products-template.csv" download className={buttonVariants({ variant: "outline", size: "lg" })}>
            Download sample template
          </a>
        </div>
        <details className="text-sm text-ink">
          <summary className="cursor-pointer font-medium">What goes in each column</summary>
          <ul className="mt-2 list-disc pl-5 text-xs text-muted">
            <li>Required: product_slug, product_name, variant_sku, variant_label, price_naira, stock.</li>
            <li>price_naira and compare_at_naira in naira, e.g. 2800 or 2,800.50. compare_at must be higher than price.</li>
            <li>categories: separated by |, written as top or top/sub, e.g. laundry/fabric-softeners|laundry.</li>
            <li>tags: separated by |, e.g. bestseller|new. featured and active: yes or no.</li>
            <li>Repeat the product columns on each option row of the same product.</li>
          </ul>
        </details>
      </section>
      <ProductImport />
    </div>
  );
}

export default function ImportExportPage() {
  return (
    <>
      <PageHeader title="Import / export" />
      <Suspense fallback={<AdminLoading />}>
        <ImportExport />
      </Suspense>
    </>
  );
}
