import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderActions } from "@/components/admin/order-actions";
import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/social-icons";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/format";
import { koboToNairaInput } from "@/lib/money";
import { storeToCustomerMessage, whatsappLink } from "@/lib/orders/messages";
import { formatOrderNumber, STATUS_LABELS } from "@/lib/orders/status";
import { PAYMENT_METHODS } from "@/lib/payments/methods";

export const metadata: Metadata = { title: "Order" };

const dateFormat = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

async function OrderDetail({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      paymentProofs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const ref = formatOrderNumber(order.number);
  const unreviewed = order.paymentProofs.filter((proof) => !proof.reviewedAt);

  return (
    <>
      <PageHeader
        title={ref}
        description={`Placed ${dateFormat.format(order.createdAt)}`}
        actions={
          <>
            <a
              href={whatsappLink(order.phoneNormalized, storeToCustomerMessage(order))}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <WhatsAppIcon className="size-4" /> Message customer
            </a>
            <Link href={`/admin/slip/${order.id}`} target="_blank" className={buttonVariants({ variant: "outline" })}>
              Packing slip
            </Link>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1">
        <Badge tone="rose">{STATUS_LABELS[order.status]}</Badge>
        <Badge>{PAYMENT_METHODS[order.paymentMethod].label}</Badge>
        {unreviewed.length > 0 && <Badge tone="gold">Proof to review</Badge>}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl bg-white p-4">
            <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Items</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.quantity} × {item.productName} <span className="text-muted">({item.variantLabel}) · {item.sku}</span>
                  </span>
                  <span className="shrink-0">{formatNaira(item.unitPriceKobo * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex flex-col gap-1 border-t border-blush-deep pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(order.subtotalKobo)}</dd></div>
              <div className="flex justify-between"><dt>Delivery fee</dt><dd>{order.deliveryFeeKobo === null ? "Not set" : formatNaira(order.deliveryFeeKobo)}</dd></div>
              {order.totalKobo !== null && (
                <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatNaira(order.totalKobo)}</dd></div>
              )}
            </dl>
          </section>

          <section className="rounded-xl bg-white p-4 text-sm">
            <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Customer and delivery</h2>
            <p className="mt-2">
              {order.customerName}
              <br />
              <a href={`tel:${order.phone}`} className="underline">{order.phone}</a> · {order.email}
              {order.customerId === null && <span className="text-muted"> · guest</span>}
            </p>
            <p className="mt-2">
              {order.street}
              {order.landmark && ` (near ${order.landmark})`}
              <br />
              {order.city}, {order.state}
            </p>
            {order.notes && <p className="mt-2 text-muted">Note: {order.notes}</p>}
            {order.riderName && (
              <p className="mt-2">
                Rider: {order.riderName}, {order.riderPhone}
                {order.dispatchNote && <span className="block text-muted">{order.dispatchNote}</span>}
              </p>
            )}
          </section>

          {order.paymentProofs.length > 0 && (
            <section className="rounded-xl bg-white p-4 text-sm">
              <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Payment proof</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {order.paymentProofs.map((proof) => (
                  <li key={proof.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {proof.path ? (
                        <a href={`/admin/api/orders/${order.id}/proofs/${proof.id}`} target="_blank" rel="noopener noreferrer" className="underline">
                          {proof.fileName ?? "Receipt"}
                        </a>
                      ) : (
                        <>Reference: <strong>{proof.reference}</strong></>
                      )}
                      <span className="block text-xs text-muted">{dateFormat.format(proof.createdAt)}</span>
                    </span>
                    {proof.reviewedAt ? <Badge>Checked</Badge> : <Badge tone="gold">To review</Badge>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl bg-white p-4 text-sm">
            <h2 className="font-sans text-sm font-medium tracking-widest uppercase">History</h2>
            <ol className="mt-2 flex flex-col gap-2">
              {order.events.map((event) => (
                <li key={event.id}>
                  <span className="text-ink">
                    {event.fromStatus === event.toStatus ? event.note : STATUS_LABELS[event.toStatus]}
                  </span>
                  {event.fromStatus !== event.toStatus && event.note && <span className="text-muted"> · {event.note}</span>}
                  <span className="block text-xs text-muted">
                    {dateFormat.format(event.createdAt)} · {event.actorEmail ?? (event.actor === "CUSTOMER" ? "Customer" : "System")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="rounded-xl bg-white p-4 lg:sticky lg:top-32">
          <h2 className="mb-3 font-sans text-sm font-medium tracking-widest uppercase">Next step</h2>
          <OrderActions
            orderId={order.id}
            status={order.status}
            paymentMethod={order.paymentMethod}
            deliveryFee={order.deliveryFeeKobo === null ? "" : koboToNairaInput(order.deliveryFeeKobo)}
            hasProof={unreviewed.length > 0}
          />
        </section>
      </div>
    </>
  );
}

export default function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <OrderDetail {...props} />
    </Suspense>
  );
}
