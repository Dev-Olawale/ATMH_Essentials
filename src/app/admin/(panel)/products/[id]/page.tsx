import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArchiveButton } from "@/components/admin/archive-button";
import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { Badge, SampleBadge } from "@/components/admin/ui";
import { getCategoryTree } from "@/lib/admin/category-tree";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { koboToNairaInput } from "@/lib/money";

export const metadata: Metadata = { title: "Edit product" };

async function EditProduct({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdminPage();
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        categories: { orderBy: { sortOrder: "asc" } },
        tags: { include: { tag: true } },
      },
    }),
    getCategoryTree(),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        actions={
          <>
            {product.active && (
              <Link href={`/product/${product.slug}`} className="inline-flex h-10 items-center px-3 text-sm underline">
                View in store
              </Link>
            )}
            <ArchiveButton productId={product.id} active={product.active} />
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1">
        {product.isSample && <SampleBadge />}
        {!product.active && <Badge>Archived</Badge>}
        {product.featured && <Badge tone="rose">Featured</Badge>}
      </div>
      {saved && (
        <p role="status" className="mb-4 rounded-lg bg-blush-deep p-3 text-sm text-ink">
          {saved === "created" ? "Product created. Now add some photos." : "Saved. The store shows the changes now."}
        </p>
      )}
      <div className="flex flex-col gap-6">
        <ProductImages
          productId={product.id}
          productName={product.name}
          images={product.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))}
        />
        <ProductForm
          // Remount after each save so the fields show what was stored.
          key={product.updatedAt.toISOString()}
          categories={categories}
          initial={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            brand: product.brand,
            description: product.description,
            featured: product.featured,
            active: product.active,
            isSample: product.isSample,
            categoryIds: product.categories.map((link) => link.categoryId),
            tags: product.tags.map((link) => link.tag.name),
            variants: product.variants.map((variant) => ({
              id: variant.id,
              key: variant.id,
              label: variant.label,
              sku: variant.sku,
              price: koboToNairaInput(variant.priceKobo),
              compareAt: variant.compareAtKobo === null ? "" : koboToNairaInput(variant.compareAtKobo),
              stock: String(variant.stockQty),
              lowStockThreshold: String(variant.lowStockThreshold),
            })),
          }}
        />
      </div>
    </>
  );
}

export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EditProduct {...props} />
    </Suspense>
  );
}
