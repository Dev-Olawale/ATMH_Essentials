import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Overview" };

async function Overview({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const admin = await requireAdminPage();
  const { error } = await searchParams;
  const [awaitingQuote, proofsToReview, toPack, bankMissing, active, archived, lowStock, outOfStock, sample] = await Promise.all([
    prisma.order.count({ where: { status: "AWAITING_DELIVERY_QUOTE" } }),
    prisma.order.count({ where: { status: "AWAITING_PAYMENT", paymentProofs: { some: { reviewedAt: null } } } }),
    prisma.order.count({ where: { status: { in: ["PAID", "CONFIRMED"] } } }),
    prisma.storeSettings.count({ where: { id: "store", bankAccountNumber: null } }),
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

  const orderStats = [
    { label: "Orders awaiting a delivery fee", value: awaitingQuote, href: "/admin/orders?status=AWAITING_DELIVERY_QUOTE" },
    { label: "Payment proofs to review", value: proofsToReview, href: "/admin/orders?view=action" },
    { label: "Orders to pack", value: toPack, href: "/admin/orders?status=PAID" },
  ];
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
        description={`Signed in as ${admin.email} (${admin.role === "OWNER" ? "owner" : "staff"})`}
        actions={
          <Link href="/admin/products/new" className={buttonVariants({ variant: "rose" })}>
            Add product
          </Link>
        }
      />
      {error === "owner-only" && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-dark bg-white p-4 text-sm text-ink">
          That page is for the shop owner only.
        </p>
      )}
      {admin.role === "OWNER" && bankMissing > 0 && (
        <p className="mb-4 rounded-xl border border-gold bg-white p-4 text-sm text-ink">
          Add your bank details in <Link href="/admin/settings" className="underline">Settings</Link> so bank-transfer
          customers know where to pay.
        </p>
      )}
      <h2 className="mb-2 font-sans text-sm font-medium tracking-widest uppercase">Orders needing action</h2>
      <ul className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {orderStats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href}
              className={`flex h-full flex-col gap-1 rounded-xl p-4 hover:ring-2 hover:ring-blush-deep ${stat.value > 0 ? "bg-white ring-2 ring-gold" : "bg-white"}`}
            >
              <span className="text-3xl font-medium text-ink">{stat.value}</span>
              <span className="text-sm text-muted">{stat.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-2 font-sans text-sm font-medium tracking-widest uppercase">Products</h2>
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
      {sample > 0 && admin.role === "OWNER" && (
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

export default function AdminHome(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Overview {...props} />
    </Suspense>
  );
}
