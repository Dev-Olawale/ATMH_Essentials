import { CircleCheck, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WhatsAppIcon } from "@/components/social-icons";
import { PaymentProofForm } from "@/components/orders/payment-proof-form";
import { ReorderButton } from "@/components/orders/reorder-button";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatNaira } from "@/lib/format";
import { orderToStoreMessage, whatsappLink } from "@/lib/orders/messages";
import { customerSteps, formatOrderNumber, STATUS_LABELS } from "@/lib/orders/status";
import { loadOrderForViewer } from "@/lib/orders/viewer";
import { PAYMENT_METHODS } from "@/lib/payments/methods";
import { bankDetailsFrom, getPrivateSettings, getPublicSettings } from "@/lib/settings";

// Behind sign-in or a private link: never prefetch (the session check can't run ahead of time).
export const prefetch = "force-disabled";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
  // The order link carries a private key; don't leak it to other sites.
  referrer: "no-referrer",
};

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

function nextSteps(status: string, method: string): string {
  switch (status) {
    case "AWAITING_DELIVERY_QUOTE":
      return "We're arranging delivery with our rider. We'll email you (and may call or WhatsApp you) with the delivery fee and your final total.";
    case "AWAITING_PAYMENT":
      return "Your final total is ready. Pay by bank transfer using the details below, then upload your receipt or send the transfer reference.";
    case "CONFIRMED":
      return "Your final total is confirmed. We're packing your order; have the total ready to pay the rider on delivery.";
    case "PAID":
      return "Payment received, thank you! We're packing your order.";
    case "PACKED":
      return "Your order is packed and will be handed to the rider soon.";
    case "OUT_FOR_DELIVERY":
      return method === "PAY_ON_DELIVERY"
        ? "Your order is on its way. Please have the total ready for the rider."
        : "Your order is on its way.";
    case "DELIVERED":
      return "Delivered. Thank you for shopping with ATMH Essentials!";
    default:
      return "This order was cancelled. If you've already paid, we'll contact you about a refund.";
  }
}

// Rendered per request (it reads the session and the link key). An unknown order, or one the viewer
// may not see, shows the not-found page with noindex and none of the order's details. The status
// stays 200 because the store's header is streamed first; nothing about the order is revealed.
export const instant = false;

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[number]">) {
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const key = typeof query.key === "string" ? query.key : null;
  const found = await loadOrderForViewer(number, key);
  if (!found) notFound();
  const { order, viewerIsOwner } = found;
  const settings = await getPublicSettings();
  const ref = formatOrderNumber(order.number);

  // Bank details only once the delivery fee is confirmed and the order is waiting for payment.
  const showBank = order.paymentMethod === "BANK_TRANSFER" && order.status === "AWAITING_PAYMENT";
  const bank = showBank ? bankDetailsFrom(await getPrivateSettings()) : null;

  const steps = customerSteps(order.paymentMethod);
  const reached = new Set(order.events.map((event) => event.toStatus));
  const when = new Map(order.events.map((event) => [event.toStatus, event.createdAt]));
  const cancelled = order.status === "CANCELLED";
  const whatsapp = whatsappLink(settings.whatsappNumber, orderToStoreMessage(order));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 lg:py-8">
      {query.placed && (
        <div role="status" className="rounded-2xl bg-white p-4 text-center">
          <p className="font-serif text-3xl text-ink">Thank you for your order!</p>
          <p className="mt-1 text-sm text-muted">
            We&apos;ve emailed a copy to {order.email}. Keep this page&apos;s link to check your order later, or track it
            with your order number and phone at <Link href="/track" className="underline">/track</Link>.
          </p>
        </div>
      )}

      <SectionHeading as="h1" label={`Placed ${dateFormat.format(order.createdAt)}`} title={`Order ${ref}`} />
      <p className="-mt-2 text-center">
        <span className="inline-flex h-7 items-center rounded-full bg-ink px-3 text-xs tracking-widest text-white uppercase">
          {STATUS_LABELS[order.status]}
        </span>
      </p>

      <section className="rounded-2xl bg-white p-4 sm:p-6">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">What happens next</h2>
        <p className="mt-2 text-sm text-ink">{nextSteps(order.status, order.paymentMethod)}</p>
        {order.status === "OUT_FOR_DELIVERY" && order.riderName && (
          <p className="mt-2 text-sm text-ink">
            Rider: {order.riderName}
            {order.riderPhone && <>, <a href={`tel:${order.riderPhone}`} className="underline">{order.riderPhone}</a></>}
            {order.dispatchNote && <span className="block text-muted">{order.dispatchNote}</span>}
          </p>
        )}
        {!cancelled && (
          <ol className="mt-4 flex flex-col gap-3" aria-label="Order progress">
            {steps.map((step) => {
              const done = reached.has(step.status);
              const at = when.get(step.status);
              return (
                <li key={step.status} className="flex items-start gap-3 text-sm">
                  {done ? (
                    <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-gold-dark" />
                  ) : (
                    <Circle aria-hidden="true" className="size-5 shrink-0 text-blush-deep" />
                  )}
                  <span className={done ? "text-ink" : "text-muted"}>
                    {step.label}
                    <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
                    {at && <span className="block text-xs text-muted">{dateFormat.format(at)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {showBank && (
        <section className="rounded-2xl border border-gold bg-white p-4 sm:p-6">
          <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Pay by bank transfer</h2>
          {bank ? (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Bank</dt>
              <dd className="text-ink">{bank.bankName}</dd>
              <dt className="text-muted">Account name</dt>
              <dd className="text-ink">{bank.accountName}</dd>
              <dt className="text-muted">Account number</dt>
              <dd className="font-medium tracking-wider text-ink">{bank.accountNumber}</dd>
              <dt className="text-muted">Amount</dt>
              <dd className="font-medium text-ink">{formatNaira(order.totalKobo ?? 0)}</dd>
              <dt className="text-muted">Reference</dt>
              <dd className="text-ink">{ref}</dd>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-ink">
              We&apos;ll send our bank details shortly. Please don&apos;t pay until you have them, or ask us on WhatsApp.
            </p>
          )}
          <div className="mt-4">
            <PaymentProofForm orderNumber={ref} accessKey={key} />
          </div>
          {order.paymentProofs.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1 text-xs text-muted">
              {order.paymentProofs.map((proof) => (
                <li key={proof.id}>
                  {proof.fileName ? `Receipt "${proof.fileName}"` : `Reference "${proof.reference}"`} sent{" "}
                  {dateFormat.format(proof.createdAt)} · {proof.reviewedAt ? "checked" : "being checked"}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 sm:p-6">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Items</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="text-ink">
                {item.quantity} × {item.productName} <span className="text-muted">({item.variantLabel})</span>
              </span>
              <span className="shrink-0">{formatNaira(item.unitPriceKobo * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-1 border-t border-blush-deep pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatNaira(order.subtotalKobo)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Delivery fee</dt>
            <dd className="text-right">{order.deliveryFeeKobo === null ? "Pending: we'll confirm it soon" : formatNaira(order.deliveryFeeKobo)}</dd>
          </div>
          {order.totalKobo !== null && (
            <div className="flex justify-between text-base font-medium">
              <dt>Total</dt>
              <dd>{formatNaira(order.totalKobo)}</dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-xs text-muted">Payment: {PAYMENT_METHODS[order.paymentMethod].label}</p>
      </section>

      <section className="rounded-2xl bg-white p-4 text-sm sm:p-6">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Delivery</h2>
        <p className="mt-2 text-ink">
          {order.customerName} · {order.phone}
          <br />
          {order.street}
          {order.landmark && ` (near ${order.landmark})`}
          <br />
          {order.city}, {order.state}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "lg", className: "gap-2" })}
        >
          <WhatsAppIcon className="size-4" />
          Send order to WhatsApp
        </a>
        {viewerIsOwner && <ReorderButton orderNumber={ref} />}
      </div>
    </div>
  );
}
