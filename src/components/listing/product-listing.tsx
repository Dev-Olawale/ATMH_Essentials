import { SearchX } from "lucide-react";
import Link from "next/link";

import { ListingShell } from "@/components/listing/listing-shell";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import type { Product } from "@/data/products";
import {
  applyListing,
  listingQuery,
  PAGE_SIZE,
  parseListingParams,
  type RawParams,
} from "@/lib/listing";

export function EmptyListing({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-4 py-12 text-center">
      <SearchX aria-hidden="true" className="size-10 text-rose-dark" strokeWidth={1} />
      <p className="font-serif text-2xl text-ink">{title}</p>
      <p className="max-w-md text-sm text-muted">{message}</p>
      <Link href="/category" className={buttonVariants({ variant: "rose" })}>
        All categories
      </Link>
    </div>
  );
}

export function ProductListing({
  products,
  params,
  basePath,
  q,
}: {
  products: Product[];
  params: RawParams;
  basePath: string;
  q?: string;
}) {
  const filters = parseListingParams(params);
  const matches = applyListing(products, filters);
  const visible = matches.slice(0, filters.show);
  const brands = [...new Set(products.map((product) => product.brand))].sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <ListingShell basePath={basePath} q={q} filters={filters} brands={brands} total={matches.length}>
      {matches.length === 0 ? (
        <EmptyListing
          title="Nothing matches those filters"
          message="Try removing a filter, or browse everything we stock."
        />
      ) : (
        <>
          <h2 className="sr-only">Products</h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {visible.map((product) => (
              <li key={product.slug}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          {matches.length > visible.length && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-xs text-muted">
                Showing {visible.length} of {matches.length}
              </p>
              <Link
                href={`${basePath}${listingQuery({ ...filters, show: filters.show + PAGE_SIZE }, q)}`}
                scroll={false}
                prefetch={false}
                className={buttonVariants({ variant: "outline" })}
              >
                Load more
              </Link>
            </div>
          )}
        </>
      )}
    </ListingShell>
  );
}

export function ListingSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="aspect-[3/5] animate-pulse rounded-2xl bg-blush-deep" />
      ))}
    </div>
  );
}
