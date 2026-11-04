import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { pageOpenGraph } from "@/config/site";
import { getCategory, getProduct, relatedProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-db";
import { categoryHref } from "@/lib/catalog-types";
import { productJsonLd, serializeJsonLd } from "@/lib/product-json-ld";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct((await getCatalog()).products, slug);
  if (!product) return {};
  const url = `/product/${slug}`;
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: url },
    openGraph: pageOpenGraph(
      product.name,
      product.description,
      url,
      product.images.map((image) => image.url),
    ),
  };
}

// Product pages are prerendered for every known slug, so letting the page wait for its params keeps
// the heading and price in the first HTML (good LCP). Navigations to them are prefetched anyway.
// This opts the route out of the "instant navigation" dev check that asked for a Suspense boundary.
export const instant = false;

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const { categories, products } = await getCatalog();
  const product = getProduct(products, slug);
  if (!product) notFound();

  const primary = product.categories[0];
  const category = primary && getCategory(categories, primary.category);
  const icon = product.icon;
  const related = relatedProducts(products, product);

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
