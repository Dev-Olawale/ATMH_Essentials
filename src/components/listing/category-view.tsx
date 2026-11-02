import Link from "next/link";
import { Suspense } from "react";

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import {
  EmptyListing,
  ListingSkeleton,
  ProductListing,
} from "@/components/listing/product-listing";
import { SectionHeading } from "@/components/ui/section-heading";
import { categoryHref, type Category, type Subcategory } from "@/data/categories";
import { productsInCategory } from "@/lib/catalog";
import type { RawParams } from "@/lib/listing";

async function ResolvedListing({
  products,
  searchParams,
  basePath,
}: {
  products: ReturnType<typeof productsInCategory>;
  searchParams: Promise<RawParams>;
  basePath: string;
}) {
  return <ProductListing products={products} params={await searchParams} basePath={basePath} />;
}

/** Fallback while the route's params resolve; matches CategoryView's layout. */
export function CategoryPageSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <div className="h-6 w-48 animate-pulse rounded bg-blush-deep" />
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="h-4 w-12 animate-pulse rounded bg-blush-deep" />
        <div className="h-9 w-64 max-w-full animate-pulse rounded bg-blush-deep sm:h-10" />
        <span className="mt-1 h-px w-16 bg-gold" />
      </div>
      <div className="mt-6 flex gap-2 overflow-hidden pb-2 lg:justify-center">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-blush-deep" />
        ))}
      </div>
      <div className="mt-6">
        <ListingSkeleton />
      </div>
    </div>
  );
}

/** Shared by the category and subcategory routes. `path` is empty on the category itself. */
export function CategoryView({
  category,
  path,
  searchParams,
}: {
  category: Category;
  path: Subcategory[];
  searchParams: Promise<RawParams>;
}) {
  const root = categoryHref(category.slug);
  const current = path.at(-1);
  const products = productsInCategory(category, current);
  const heading = current?.name ?? category.name;
  const basePath = current ? `${root}/${current.slug}` : root;

  const crumbs: Crumb[] = [
    { label: "Categories", href: "/category" },
    { label: category.name, href: current ? root : undefined },
    ...path.map((node, index) => ({
      label: node.name,
      href: index < path.length - 1 ? `${root}/${node.slug}` : undefined,
    })),
  ];

  // Show what sits below this level; a leaf shows its siblings so shoppers can move sideways.
  const parent: Subcategory = path.at(-2) ?? category;
  const chipParent = current?.children?.length ? current : current ? parent : category;
  const chips = chipParent.children ?? [];
  const allHref = chipParent === category ? root : `${root}/${chipParent.slug}`;

  const chipClass = (active: boolean) =>
    `inline-flex h-10 items-center rounded-full border px-4 text-xs whitespace-nowrap transition-colors ${
      active
        ? "border-ink bg-ink text-white"
        : "border-blush-deep bg-white text-ink hover:border-ink"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6">
        <SectionHeading as="h1" label="Shop" title={heading} />
      </div>
      {chips.length > 0 && (
        <nav aria-label="Subcategories" className="mt-6">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-wrap lg:justify-center lg:px-0">
            <li>
              <Link
                href={allHref}
                aria-current={basePath === allHref ? "page" : undefined}
                className={chipClass(basePath === allHref)}
              >
                All
              </Link>
            </li>
            {chips.map((chip) => {
              const href = `${root}/${chip.slug}`;
              return (
                <li key={chip.slug}>
                  <Link
                    href={href}
                    aria-current={basePath === href ? "page" : undefined}
                    className={chipClass(basePath === href)}
                  >
                    {chip.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <div className="mt-6">
        {products.length === 0 ? (
          <EmptyListing
            title={`No products in ${heading} yet`}
            message="We are still stocking this section. Have a look through our other categories."
          />
        ) : (
          <Suspense fallback={<ListingSkeleton />}>
            <ResolvedListing products={products} searchParams={searchParams} basePath={basePath} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
