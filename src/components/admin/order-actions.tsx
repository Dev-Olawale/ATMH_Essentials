"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelOrder,
  dispatchOrder,
  markDelivered,
  markPacked,
  markPaid,
  setDeliveryFee,
  type OrderActionResult,
} from "@/app/admin/actions/orders";
import { Field, inputClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { OrderStatusId } from "@/lib/orders/status";

type Props = {
  orderId: string;
  status: OrderStatusId;
  paymentMethod: "BANK_TRANSFER" | "PAY_ON_DELIVERY" | "PAYSTACK";
  deliveryFee: string;
  hasProof: boolean;
};

/** The next steps for an order. Only the moves allowed from its current status are shown. */
export function OrderActions({ orderId, status, paymentMethod, deliveryFee, hasProof }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fee, setFee] = useState(deliveryFee);
  const [rider, setRider] = useState({ riderName: "", riderPhone: "", note: "" });
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  const run = (task: () => Promise<OrderActionResult>) =>
    startTransition(async () => {
      setError("");
      const result = await task();
      if (!result.ok) setError(result.error);
      else {
        setCancelling(false);
        router.refresh();
      }
    });

  const canQuote = status === "AWAITING_DELIVERY_QUOTE" || status === "AWAITING_PAYMENT" || status === "CONFIRMED";
  const open = status !== "DELIVERED" && status !== "CANCELLED";

  return (
    <div className="flex flex-col gap-4">
      {canQuote && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => setDeliveryFee(orderId, fee));
          }}
        >
          <Field
            label={status === "AWAITING_DELIVERY_QUOTE" ? "Delivery fee from the rider (₦)" : "Correct the delivery fee (₦)"}
            htmlFor="delivery-fee"
            hint="Saving emails the customer their final total"
          >
            <input id="delivery-fee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} className={inputClass} />
          </Field>
          <Button type="submit" size="lg" variant={status === "AWAITING_DELIVERY_QUOTE" ? "rose" : "outline"} disabled={pending || !fee.trim()}>
            {status === "AWAITING_DELIVERY_QUOTE" ? "Confirm fee and email customer" : "Update fee"}
          </Button>
        </form>
      )}

      {status === "AWAITING_PAYMENT" && paymentMethod === "BANK_TRANSFER" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink">
            {hasProof ? "The customer sent proof of payment (below). " : ""}Check your bank app before marking as paid.
          </p>
          <Button type="button" size="lg" variant="rose" disabled={pending} onClick={() => run(() => markPaid(orderId))}>
            Mark as paid
          </Button>
        </div>
      )}

      {(status === "PAID" || status === "CONFIRMED") && (
        <Button type="button" size="lg" variant="rose" disabled={pending} onClick={() => run(() => markPacked(orderId))}>
          Mark as packed
        </Button>
      )}

      {status === "PACKED" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => dispatchOrder(orderId, rider));
          }}
        >
          <Field label="Rider's name" htmlFor="rider-name">
            <input id="rider-name" value={rider.riderName} onChange={(event) => setRider({ ...rider, riderName: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Rider's phone" htmlFor="rider-phone">
            <input id="rider-phone" type="tel" inputMode="tel" value={rider.riderPhone} onChange={(event) => setRider({ ...rider, riderPhone: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Note for the customer (optional)" htmlFor="rider-note" hint="e.g. Expected this afternoon">
            <input id="rider-note" value={rider.note} onChange={(event) => setRider({ ...rider, note: event.target.value })} className={inputClass} />
          </Field>
          <Button type="submit" size="lg" variant="rose" disabled={pending}>
            Send out for delivery
          </Button>
        </form>
      )}

      {status === "OUT_FOR_DELIVERY" && (
        <Button type="button" size="lg" variant="rose" disabled={pending} onClick={() => run(() => markDelivered(orderId))}>
          {paymentMethod === "PAY_ON_DELIVERY" ? "Delivered and paid" : "Mark as delivered"}
        </Button>
      )}

      {open &&
        (cancelling ? (
          <form
            className="flex flex-col gap-2 rounded-lg border border-rose-dark bg-blush p-3"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => cancelOrder(orderId, reason));
            }}
          >
            <Field label="Reason (the customer sees this)" htmlFor="cancel-reason">
              <input id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
            </Field>
            <p className="text-xs text-muted">Cancelling puts the items back in stock and emails the customer.</p>
            <div className="flex gap-2">
              <Button type="submit" size="lg" disabled={pending}>
                Cancel order
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setCancelling(false)}>
                Keep order
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="ghost" className="self-start" onClick={() => setCancelling(true)}>
            Cancel order…
          </Button>
        ))}

      {error && (
        <p role="alert" className="border-l-2 border-rose-dark pl-2 text-ink text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
