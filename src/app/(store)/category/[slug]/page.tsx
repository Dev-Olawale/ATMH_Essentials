import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryPageSkeleton, CategoryView } from "@/components/listing/category-view";
import { getCategory } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-db";
import { categoryHref } from "@/lib/catalog-types";
import { pageOpenGraph, siteConfig } from "@/config/site";

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory((await getCatalog()).categories, slug);
  if (!category) return {};
  const description = `Shop ${category.name} at ${siteConfig.name}, with fast delivery across Lagos.`;
  return {
    title: category.name,
    description,
    alternates: { canonical: categoryHref(slug) },
    openGraph: pageOpenGraph(category.name, description, categoryHref(slug)),
  };
}

async function CategoryContent({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const { categories, products } = await getCatalog();
  const category = getCategory(categories, slug);
  if (!category) notFound();

  return (
    <CategoryView category={category} path={[]} products={products} searchParams={searchParams} />
  );
}

// URL data is awaited inside Suspense so navigations show the skeleton instantly.
export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
