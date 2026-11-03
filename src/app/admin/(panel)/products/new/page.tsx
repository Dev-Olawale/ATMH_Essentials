import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { emptyVariant } from "@/lib/admin/variant-values";
import { getCategoryTree } from "@/lib/admin/category-tree";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Add product" };

async function NewProduct() {
  await requireAdminPage();
  const categories = await getCategoryTree();
  return (
    <>
      <p className="mb-4 rounded-lg bg-white p-3 text-sm text-muted">
        Fill in the details and press Create. You can add photos straight after.
      </p>
      <ProductForm
        categories={categories}
        initial={{
          name: "",
          slug: "",
          brand: "",
          description: "",
          featured: false,
          active: true,
          isSample: false,
          categoryIds: [],
          tags: [],
          variants: [emptyVariant("first")],
        }}
      />
    </>
  );
}

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="Add product" />
      <Suspense fallback={<AdminLoading />}>
        <NewProduct />
      </Suspense>
    </>
  );
}
