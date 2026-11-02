import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { pageOpenGraph } from "@/config/site";
import { categoryHref, getCategory } from "@/data/categories";
import { getAllProducts, getProduct, relatedProducts } from "@/lib/catalog";
import { productJsonLd, serializeJsonLd } from "@/lib/product-json-ld";

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const url = `/product/${slug}`;
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: url },
    openGraph: pageOpenGraph(product.name, product.description, url, product.images),
  };
}

/** Fallback while the route's params resolve; matches the gallery + details layout. */
function ProductPageSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <div className="h-6 w-56 max-w-full animate-pulse rounded bg-blush-deep" />
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-square animate-pulse rounded-2xl bg-blush-deep" />
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 animate-pulse rounded bg-blush-deep" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-blush-deep" />
          </div>
          <div className="h-8 w-32 animate-pulse rounded bg-blush-deep" />
          <div className="flex gap-2">
            <div className="h-10 w-20 animate-pulse rounded-full bg-blush-deep" />
            <div className="h-10 w-20 animate-pulse rounded-full bg-blush-deep" />
          </div>
          <div className="h-12 w-full animate-pulse rounded-full bg-blush-deep" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-blush-deep" />
        </div>
      </div>
    </div>
  );
}

// URL data is awaited inside Suspense so navigations show the skeleton instantly.
export default function ProductPage(props: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductContent {...props} />
    </Suspense>
  );
}

async function ProductContent({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const category = getCategory(product.categories[0].category);
  const icon = category?.icon ?? "PackageOpen";
  const related = relatedProducts(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd(product)) }}
      />
      <Breadcrumbs
        items={[
          ...(category ? [{ label: category.name, href: categoryHref(category.slug) }] : []),
          { label: product.name },
        ]}
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} icon={icon} />
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted uppercase">{product.brand}</p>
            <h1 className="mt-1 text-4xl leading-tight font-medium text-ink">{product.name}</h1>
          </div>
          <ProductPurchase product={product} icon={icon} />
          <div className="border-t border-blush-deep pt-5">
            <h2 className="font-sans text-xs font-medium tracking-[0.2em] text-ink uppercase">
              Description
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">{product.description}</p>
          </div>
          <div className="border-t border-blush-deep pt-5">
            <h2 className="font-sans text-xs font-medium tracking-[0.2em] text-ink uppercase">
              Delivery
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              Delivery fees and timing depend on your location and are confirmed at checkout. See{" "}
              <Link href="/delivery-returns" className="underline">
                Delivery &amp; Returns
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading label="You may also need" title="Related Products" />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.slug}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
