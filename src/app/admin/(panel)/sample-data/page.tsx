import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { SampleDataForm } from "@/components/admin/sample-data-form";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Sample data" };

async function SampleData() {
  await requireAdminPage();
  const [products, categories, images] = await Promise.all([
    prisma.product.count({ where: { isSample: true } }),
    prisma.category.count({ where: { isSample: true } }),
    prisma.productImage.count({ where: { product: { isSample: true } } }),
  ]);
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-4">
      <p className="text-sm text-ink">
        The store started with sample products so it didn&apos;t look empty. They are marked{" "}
        <strong>Sample</strong> in the admin. Remove them once your own products are in.
      </p>
      <ul className="text-sm text-muted">
        <li>{products} sample products ({images} photos)</li>
        <li>{categories} sample categories</li>
      </ul>
      <p className="text-xs text-muted">
        To keep one sample product, open it and untick &quot;Sample product&quot; before removing.
      </p>
      <SampleDataForm products={products} categories={categories} />
    </section>
  );
}

export default function SampleDataPage() {
  return (
    <>
      <PageHeader title="Sample data" />
      <Suspense fallback={<AdminLoading />}>
        <SampleData />
      </Suspense>
    </>
  );
}
