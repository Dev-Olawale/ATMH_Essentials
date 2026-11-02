import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryPageSkeleton, CategoryView } from "@/components/listing/category-view";
import { categories, categoryHref, getCategory } from "@/data/categories";
import { pageOpenGraph, siteConfig } from "@/config/site";

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
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
  const category = getCategory(slug);
  if (!category) notFound();

  return <CategoryView category={category} path={[]} searchParams={searchParams} />;
}

// URL data is awaited inside Suspense so navigations show the skeleton instantly.
export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
