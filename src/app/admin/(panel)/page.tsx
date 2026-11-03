import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Overview" };

async function Overview() {
  const admin = await requireAdminPage();
  const [active, archived, lowStock, outOfStock, sample] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { active: false } }),
    prisma.productVariant.count({
      where: {
        product: { active: true },
        stockQty: { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold },
      },
    }),
    prisma.productVariant.count({ where: { product: { active: true }, stockQty: 0 } }),
    prisma.product.count({ where: { isSample: true } }),
  ]);

  const stats = [
    { label: "Products in the store", value: active, href: "/admin/products" },
    { label: "Archived products", value: archived, href: "/admin/products?status=archived" },
    { label: "Options running low", value: lowStock, href: "/admin/low-stock" },
    { label: "Options out of stock", value: outOfStock, href: "/admin/low-stock" },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Signed in as ${admin.email}`}
        actions={
          <Link href="/admin/products/new" className={buttonVariants({ variant: "rose" })}>
            Add product
          </Link>
        }
      />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link href={stat.href} className="flex h-full flex-col gap-1 rounded-xl bg-white p-4 hover:ring-2 hover:ring-blush-deep">
              <span className="text-3xl font-medium text-ink">{stat.value}</span>
              <span className="text-sm text-muted">{stat.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {sample > 0 && (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm text-ink">
          {sample} sample products are still in the store.{" "}
          <Link href="/admin/sample-data" className="underline">
            Remove sample data
          </Link>{" "}
          once your own products are in.
        </p>
      )}
    </>
  );
}

export default function AdminHome() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Overview />
    </Suspense>
  );
}
