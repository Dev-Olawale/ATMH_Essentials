import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { Badge, inputClass } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/format";
import { normalizePhone } from "@/lib/nigeria";
import { formatOrderNumber, ORDER_STATUSES, parseOrderNumber, STATUS_LABELS, type OrderStatusId } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 50;
const dateFormat = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

async function OrderList({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requireAdminPage();
  const params = await searchParams;
  const q = one(params.q).slice(0, 100);
  const status = one(params.status);
  const from = one(params.from);
  const to = one(params.to);
  const needsAction = one(params.view) === "action";
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);

  const asNumber = parseOrderNumber(q);
  const asPhone = normalizePhone(q);
  const where: Prisma.OrderWhereInput = {
    ...((ORDER_STATUSES as string[]).includes(status) && { status: status as OrderStatusId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(`${from}T00:00:00+01:00`) }),
        ...(to && { lte: new Date(`${to}T23:59:59+01:00`) }),
      },
    }),
    ...(needsAction && {
      OR: [
        { status: "AWAITING_DELIVERY_QUOTE" },
        { status: "AWAITING_PAYMENT", paymentProofs: { some: { reviewedAt: null } } },
      ],
    }),
    ...(q && {
      AND: [
        {
          OR: [
            ...(asNumber !== null ? [{ number: asNumber }] : []),
            ...(asPhone ? [{ phoneNormalized: asPhone }] : []),
            { customerName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        },
      ],
    }),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { paymentProofs: { where: { reviewedAt: null }, select: { id: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) =>
    `/admin/orders?${new URLSearchParams({ q, status, from, to, ...(needsAction && { view: "action" }), page: String(target) })}`;

  return (
    <>
      <form className="mb-4 grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} placeholder="Order number, phone or name" aria-label="Search orders" className={inputClass} />
        <select name="status" defaultValue={status} aria-label="Status" className={inputClass}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={from} aria-label="From date" className={inputClass} />
        <input type="date" name="to" defaultValue={to} aria-label="To date" className={inputClass} />
        <button type="submit" className={buttonVariants({ size: "lg" })}>
          Filter
        </button>
      </form>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/orders?view=action" className={`rounded-full px-3 py-1.5 ${needsAction ? "bg-ink text-white" : "bg-white text-ink"}`}>
          Needs action
        </Link>
        <Link href="/admin/orders" className={`rounded-full px-3 py-1.5 ${!needsAction && !status && !q ? "bg-ink text-white" : "bg-white text-ink"}`}>
          All orders
        </Link>
        <span className="text-muted">
          {total} order{total === 1 ? "" : "s"}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-muted">No orders match.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/admin/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 hover:ring-2 hover:ring-blush-deep">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {formatOrderNumber(order.number)} · {order.customerName}
                  </p>
                  <p className="text-xs text-muted">
                    {dateFormat.format(order.createdAt)} · {order.city}, {order.state} ·{" "}
                    {formatNaira(order.totalKobo ?? order.subtotalKobo)}
                    {order.totalKobo === null && " + delivery"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {order.paymentProofs.length > 0 && order.status === "AWAITING_PAYMENT" && <Badge tone="gold">Proof to review</Badge>}
                  <Badge tone={order.status === "AWAITING_DELIVERY_QUOTE" ? "rose" : "muted"}>{STATUS_LABELS[order.status]}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={pageHref(page - 1)} className="underline">Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={pageHref(page + 1)} className="underline">Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}

export default function OrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <>
      <PageHeader title="Orders" />
      <Suspense fallback={<AdminLoading />}>
        <OrderList {...props} />
      </Suspense>
    </>
  );
}
