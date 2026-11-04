import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryManager } from "@/components/admin/category-manager";
import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { getCategoryTree } from "@/lib/admin/category-tree";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Categories" };

async function Categories() {
  await requireAdminPage();
  return <CategoryManager categories={await getCategoryTree()} />;
}

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Categories"
        description="Use the arrows to change the order shoppers see. Untick Shown to hide a category and everything inside it."
      />
      <Suspense fallback={<AdminLoading />}>
        <Categories />
      </Suspense>
    </>
  );
}
