import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PrintButton } from "@/components/admin/print-button";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatOrderNumber } from "@/lib/orders/status";
import { PAYMENT_METHODS } from "@/lib/payments/methods";

export const metadata: Metadata = { title: "Packing slip" };

/** A plain, printable slip: what to pack and where it goes. No prices, so it can travel with the parcel. */
async function Slip({ params }: PageProps<"/admin/slip/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: { orderBy: { id: "asc" } } } });
  if (!order) notFound();
  return (
    <div className="mx-auto w-full max-w-2xl bg-white p-6 text-ink print:p-0">
      <div className="flex items-start justify-between gap-4 border-b border-ink pb-3">
        <div>
          <p className="font-serif text-2xl">ATMH Essentials</p>
          <p className="text-xs tracking-widest uppercase">Packing slip</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-medium">{formatOrderNumber(order.number)}</p>
          <p className="text-xs">{order.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs tracking-widest uppercase">Deliver to</p>
          <p className="mt-1 text-sm">
            {order.customerName}
            <br />
            {order.phone}
            <br />
            {order.street}
            {order.landmark && <><br />Near {order.landmark}</>}
            <br />
            {order.city}, {order.state}
          </p>
        </div>
        <div>
          <p className="text-xs tracking-widest uppercase">Payment</p>
          <p className="mt-1 text-sm">{PAYMENT_METHODS[order.paymentMethod].label}</p>
          {order.notes && (
            <>
              <p className="mt-2 text-xs tracking-widest uppercase">Customer note</p>
              <p className="mt-1 text-sm">{order.notes}</p>
            </>
          )}
        </div>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink">
            <th className="py-2 pr-2">Packed</th>
            <th className="py-2 pr-2">Qty</th>
            <th className="py-2 pr-2">Item</th>
            <th className="py-2">SKU</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-blush-deep">
              <td className="py-2 pr-2"><span className="inline-block size-4 border border-ink" aria-hidden="true" /></td>
              <td className="py-2 pr-2 font-medium">{item.quantity}</td>
              <td className="py-2 pr-2">{item.productName} ({item.variantLabel})</td>
              <td className="py-2">{item.sku}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}

export default function SlipPage(props: PageProps<"/admin/slip/[id]">) {
  return (
    <main className="flex-1 bg-blush py-6 print:bg-white print:py-0">
      <Suspense>
        <Slip {...props} />
      </Suspense>
    </main>
  );
}
