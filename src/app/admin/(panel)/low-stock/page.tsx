import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { StockEditor } from "@/components/admin/stock-editor";
import { Badge } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Low stock" };

async function LowStock() {
  await requireAdminPage();
  const variants = await prisma.productVariant.findMany({
    where: {
      product: { active: true },
      stockQty: { lte: prisma.productVariant.fields.lowStockThreshold },
    },
    orderBy: [{ stockQty: "asc" }, { product: { name: "asc" } }],
    include: { product: { select: { id: true, name: true } } },
  });

  if (variants.length === 0) {
    return <p className="rounded-xl bg-white p-6 text-center text-sm text-muted">Nothing is running low. 🎉</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {variants.map((variant) => (
        <li key={variant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3">
          <div className="min-w-0">
            <Link href={`/admin/products/${variant.product.id}`} className="text-sm font-medium text-ink underline">
              {variant.product.name}
            </Link>
            <p className="text-xs text-muted">
              {variant.label} · SKU {variant.sku} · alert at {variant.lowStockThreshold}
            </p>
            <div className="mt-1">
              {variant.stockQty === 0 ? <Badge tone="rose">Out of stock</Badge> : <Badge>{variant.stockQty} left</Badge>}
            </div>
          </div>
          <StockEditor variantId={variant.id} stock={variant.stockQty} label={`${variant.product.name} ${variant.label}`} />
        </li>
      ))}
    </ul>
  );
}

export default function LowStockPage() {
  return (
    <>
      <PageHeader
        title="Low stock"
        description="Options at or below their low-stock alert, in products shown in the store. Type the new count after restocking."
      />
      <Suspense fallback={<AdminLoading />}>
        <LowStock />
      </Suspense>
    </>
  );
}
