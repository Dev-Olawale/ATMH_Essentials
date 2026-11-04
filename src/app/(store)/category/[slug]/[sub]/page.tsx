import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryView } from "@/components/listing/category-view";
import { pageOpenGraph, siteConfig } from "@/config/site";
import { allSubcategorySlugs, findSubcategoryPath, getCategory } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-db";
import { categoryHref, type Category } from "@/lib/catalog-types";

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  return categories.flatMap((category) =>
    allSubcategorySlugs(category).map((sub) => ({ slug: category.slug, sub })),
  );
}

function resolve(categories: Category[], slug: string, sub: string) {
  const category = getCategory(categories, slug);
  const path = category && findSubcategoryPath(category, sub);
  return category && path ? { category, path } : undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/category/[slug]/[sub]">): Promise<Metadata> {
  const { slug, sub } = await params;
  const match = resolve((await getCatalog()).categories, slug, sub);
  if (!match) return {};
  const name = match.path.at(-1)!.name;
  const title = `${name} - ${match.category.name}`;
  const description = `Shop ${name} in ${match.category.name} at ${siteConfig.name}, with fast delivery across Lagos.`;
  const url = `${categoryHref(slug)}/${sub}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: pageOpenGraph(title, description, url),
  };
}

// The heading, breadcrumbs and chips render in the first HTML (good LCP); only the product grid,
// which depends on the filters in the query string, streams in behind its own Suspense boundary.
// This opts the route out of the "instant navigation" dev check for the params lookup.
export const instant = false;

export default async function SubcategoryPage({ params, searchParams }: PageProps<"/category/[slug]/[sub]">) {
  const { slug, sub } = await params;
  const { categories, products } = await getCatalog();
  const match = resolve(categories, slug, sub);
  if (!match) notFound();

  return (
    <CategoryView
      category={match.category}
      path={match.path}
      products={products}
      searchParams={searchParams}
    />
  );
}
