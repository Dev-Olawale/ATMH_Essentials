import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryTile } from "@/components/category-tile";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCatalog } from "@/lib/catalog-db";

export const metadata: Metadata = {
  title: "All Categories",
  description:
    "Browse household, cleaning, laundry, skincare, personal care, baby and hair essentials at ATMH Essentials.",
  alternates: { canonical: "/category" },
};

export default async function CategoriesPage() {
  const { categories } = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <Breadcrumbs items={[{ label: "Categories" }]} />
      <div className="mt-6">
        <SectionHeading as="h1" label="Browse" title="All Categories" />
      </div>
      <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
        {categories.map((category) => (
          <li key={category.slug}>
            <CategoryTile category={category} />
          </li>
        ))}
      </ul>
    </div>
  );
}
