import type { Metadata } from "next";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  EmptyListing,
  ListingSkeleton,
  ProductListing,
} from "@/components/listing/product-listing";
import { SectionHeading } from "@/components/ui/section-heading";
import { searchProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Search",
  description: "Search all ATMH Essentials products.",
  robots: { index: false, follow: true },
};

async function SearchResults({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.slice(0, 100).trim() ?? "";
  const products = searchProducts(q);

  return (
    <>
      <div className="mt-6">
        <SectionHeading as="h1" label="Search" title={q ? `Results for “${q}”` : "All products"} />
      </div>
      <div className="mt-6">
        {products.length === 0 ? (
          <EmptyListing
            title="No products found"
            message="Check the spelling or try a more general word, like “soap” or “lotion”."
          />
        ) : (
          <ProductListing products={products} params={params} basePath="/search" q={q} />
        )}
      </div>
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <Breadcrumbs items={[{ label: "Search" }]} />
      <Suspense fallback={<div className="mt-6"><ListingSkeleton /></div>}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
