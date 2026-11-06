import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { Badge, inputClass } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { getCategoryTree } from "@/lib/admin/category-tree";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 50;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

async function ProductList({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  await requireAdminPage();
  const params = await searchParams;
  const q = one(params.q).slice(0, 100);
  const status = one(params.status) || "active";
  const category = one(params.category);
  const review = one(params.review);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(status === "active" && { active: true }),
    ...(status === "archived" && { active: false }),
    // Needs review: price and stock not yet checked by the owner, or no photo yet.
    ...(review === "needs" && { AND: [{ OR: [{ reviewed: false }, { images: { none: {} } }] }] }),
    ...(category && { categories: { some: { categoryId: category } } }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
      ],
    }),
  };

  const [tree, total, products] = await Promise.all([
    getCategoryTree(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        variants: { select: { priceKobo: true, stockQty: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) => {
    const query = new URLSearchParams({ q, status, category, review, page: String(target) });
    return `/admin/products?${query}`;
  };

  return (
    <>
      <form className="mb-4 grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} placeholder="Search name, brand or SKU" aria-label="Search" className={inputClass} />
        <select name="status" defaultValue={status} aria-label="Status" className={inputClass}>
          <option value="active">In store</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <select name="category" defaultValue={category} aria-label="Category" className={inputClass}>
          <option value="">All categories</option>
          {tree.map((node) => (
            <option key={node.id} value={node.id}>
              {" ".repeat(node.depth)}
              {node.name}
            </option>
          ))}
        </select>
        <select name="review" defaultValue={review} aria-label="Review" className={inputClass}>
          <option value="">All products</option>
          <option value="needs">Needs review</option>
        </select>
        <button type="submit" className={buttonVariants({ size: "lg" })}>
          Filter
        </button>
      </form>

      <p className="mb-2 text-sm text-muted">
        {total} product{total === 1 ? "" : "s"}
      </p>
      {products.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-muted">No products match.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const prices = product.variants.map((variant) => variant.priceKobo);
            const stock = product.variants.reduce((sum, variant) => sum + variant.stockQty, 0);
            return (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 hover:ring-2 hover:ring-blush-deep"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-blush-deep">
                    {product.images[0] && (
                      <Image src={product.images[0].url} alt="" fill sizes="3.5rem" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                    <p className="text-xs text-muted">
                      {prices.length > 0 ? formatNaira(Math.min(...prices)) : "No price"} · {stock} in stock ·{" "}
                      {product.variants.length} option{product.variants.length === 1 ? "" : "s"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!product.reviewed && <Badge tone="gold">Price to confirm</Badge>}
                      {!product.reviewed && <Badge tone="gold">Stock to confirm</Badge>}
                      {product.images.length === 0 && <Badge>No photo</Badge>}
                      {!product.active && <Badge>Archived</Badge>}
                      {product.featured && <Badge tone="rose">Featured</Badge>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={pageHref(page - 1)} className="underline">Previous</Link> : <span />}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={pageHref(page + 1)} className="underline">Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}

export default function ProductsPage(props: PageProps<"/admin/products">) {
  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <>
            <Link href="/admin/products/photos" className={buttonVariants({ variant: "outline" })}>
              Bulk photo upload
            </Link>
            <Link href="/admin/products/new" className={buttonVariants({ variant: "rose" })}>
              Add product
            </Link>
          </>
        }
      />
      <Suspense fallback={<AdminLoading />}>
        <ProductList {...props} />
      </Suspense>
    </>
  );
}
