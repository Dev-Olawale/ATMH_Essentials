import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryPageSkeleton, CategoryView } from "@/components/listing/category-view";
import { pageOpenGraph, siteConfig } from "@/config/site";
import { categories, categoryHref, getCategory } from "@/data/categories";
import { allSubcategorySlugs, findSubcategoryPath } from "@/lib/catalog";

export function generateStaticParams() {
  return categories.flatMap((category) =>
    allSubcategorySlugs(category).map((sub) => ({ slug: category.slug, sub })),
  );
}

function resolve(slug: string, sub: string) {
  const category = getCategory(slug);
  const path = category && findSubcategoryPath(category, sub);
  return category && path ? { category, path } : undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/category/[slug]/[sub]">): Promise<Metadata> {
  const { slug, sub } = await params;
  const match = resolve(slug, sub);
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

async function SubcategoryContent({ params, searchParams }: PageProps<"/category/[slug]/[sub]">) {
  const { slug, sub } = await params;
  const match = resolve(slug, sub);
  if (!match) notFound();

  return <CategoryView category={match.category} path={match.path} searchParams={searchParams} />;
}

// URL data is awaited inside Suspense so navigations show the skeleton instantly.
export default function SubcategoryPage(props: PageProps<"/category/[slug]/[sub]">) {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <SubcategoryContent {...props} />
    </Suspense>
  );
}
