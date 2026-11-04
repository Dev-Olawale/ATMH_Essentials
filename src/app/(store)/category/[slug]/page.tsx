import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryView } from "@/components/listing/category-view";
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

// The heading, breadcrumbs and chips render in the first HTML (good LCP); only the product grid,
// which depends on the filters in the query string, streams in behind its own Suspense boundary.
// This opts the route out of the "instant navigation" dev check for the params lookup.
export const instant = false;

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const { categories, products } = await getCatalog();
  const category = getCategory(categories, slug);
  if (!category) notFound();

  return (
    <CategoryView category={category} path={[]} products={products} searchParams={searchParams} />
  );
}
