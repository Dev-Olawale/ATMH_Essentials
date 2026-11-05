import type { PaymentMethodId } from "@/lib/payments/methods";

export type OrderStatusId =
  | "AWAITING_DELIVERY_QUOTE"
  | "AWAITING_PAYMENT"
  | "CONFIRMED"
  | "PAID"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export const ORDER_STATUSES: OrderStatusId[] = [
  "AWAITING_DELIVERY_QUOTE",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "PAID",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

/** Short labels for admins and shoppers. */
export const STATUS_LABELS: Record<OrderStatusId, string> = {
  AWAITING_DELIVERY_QUOTE: "Awaiting delivery fee",
  AWAITING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PAID: "Paid",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/**
 * Allowed moves. After the delivery fee is set, bank-transfer orders wait for payment while
 * pay-on-delivery orders are confirmed straight away. Any open order can be cancelled.
 */
const NEXT: Record<OrderStatusId, OrderStatusId[]> = {
  AWAITING_DELIVERY_QUOTE: ["AWAITING_PAYMENT", "CONFIRMED", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PAID: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** The status an order moves to once its delivery fee is confirmed. */
export function statusAfterQuote(method: PaymentMethodId): OrderStatusId {
  return method === "BANK_TRANSFER" ? "AWAITING_PAYMENT" : "CONFIRMED";
}

export function canTransition(from: OrderStatusId, to: OrderStatusId, method: PaymentMethodId): boolean {
  if (!NEXT[from].includes(to)) return false;
  // The quote step leads to exactly one status, depending on how the shopper pays.
  if (from === "AWAITING_DELIVERY_QUOTE" && to !== "CANCELLED") return to === statusAfterQuote(method);
  // Pay-on-delivery orders are never "awaiting payment".
  if (to === "PAID" && method !== "BANK_TRANSFER") return false;
  return true;
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatusId, to: OrderStatusId) {
    super(`An order that is "${STATUS_LABELS[from]}" can't be moved to "${STATUS_LABELS[to]}".`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: OrderStatusId, to: OrderStatusId, method: PaymentMethodId): void {
  if (!canTransition(from, to, method)) throw new InvalidTransitionError(from, to);
}

export function isOpen(status: OrderStatusId): boolean {
  return status !== "DELIVERED" && status !== "CANCELLED";
}

/** The delivery fee can be set or corrected until the order is paid or packed. */
export function canSetDeliveryFee(status: OrderStatusId): boolean {
  return status === "AWAITING_DELIVERY_QUOTE" || status === "AWAITING_PAYMENT" || status === "CONFIRMED";
}

/** The steps a shopper sees on their order page, in order, for their payment method. */
export function customerSteps(method: PaymentMethodId): { status: OrderStatusId; label: string }[] {
  const steps: { status: OrderStatusId; label: string }[] = [
    { status: "AWAITING_DELIVERY_QUOTE", label: "Order received" },
    method === "BANK_TRANSFER"
      ? { status: "AWAITING_PAYMENT", label: "Final total confirmed" }
      : { status: "CONFIRMED", label: "Final total confirmed" },
  ];
  if (method === "BANK_TRANSFER") steps.push({ status: "PAID", label: "Payment received" });
  steps.push(
    { status: "PACKED", label: "Packed" },
    { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { status: "DELIVERED", label: "Delivered" },
  );
  return steps;
}

export function formatOrderNumber(number: number): string {
  return `ATMH-${number}`;
}

/** Reads "ATMH-10023", "atmh 10023", "#10023" or "10023". */
export function parseOrderNumber(input: string): number | null {
  const match = /^\s*(?:atmh)?[\s#-]*(\d{1,9})\s*$/i.exec(input);
  return match ? Number(match[1]) : null;
}
