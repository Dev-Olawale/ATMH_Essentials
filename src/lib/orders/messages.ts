import { formatNaira } from "@/lib/format";
import { formatOrderNumber } from "@/lib/orders/status";
import { PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments/methods";

export type OrderSummary = {
  number: number;
  customerName: string;
  state: string;
  city: string;
  paymentMethod: PaymentMethodId;
  subtotalKobo: number;
  deliveryFeeKobo: number | null;
  totalKobo: number | null;
  items: { productName: string; variantLabel: string; quantity: number; unitPriceKobo: number }[];
};

export function whatsappLink(phoneDigits: string, text: string): string {
  return `https://wa.me/${phoneDigits.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** The message a shopper sends the store from their order page. */
export function orderToStoreMessage(order: OrderSummary): string {
  const lines = order.items.map(
    (item) => `• ${item.quantity} x ${item.productName} (${item.variantLabel}) – ${formatNaira(item.unitPriceKobo * item.quantity)}`,
  );
  return [
    `Hello ATMH Essentials, this is my order ${formatOrderNumber(order.number)}.`,
    "",
    ...lines,
    "",
    `Subtotal: ${formatNaira(order.subtotalKobo)}`,
    order.deliveryFeeKobo === null
      ? "Delivery fee: to be confirmed"
      : `Delivery fee: ${formatNaira(order.deliveryFeeKobo)}`,
    ...(order.totalKobo !== null ? [`Total: ${formatNaira(order.totalKobo)}`] : []),
    `Payment: ${PAYMENT_METHODS[order.paymentMethod].label}`,
    `Deliver to: ${order.city}, ${order.state}`,
    `Name: ${order.customerName}`,
  ].join("\n");
}

/** The opening message an admin sends a customer about their order. */
export function storeToCustomerMessage(order: OrderSummary): string {
  const first = order.customerName.split(/\s+/)[0] || "there";
  const total =
    order.totalKobo === null
      ? `Your subtotal is ${formatNaira(order.subtotalKobo)}; we're confirming your delivery fee.`
      : `Your total is ${formatNaira(order.totalKobo)} (including ${formatNaira(order.deliveryFeeKobo ?? 0)} delivery).`;
  return `Hello ${first}, this is ATMH Essentials about your order ${formatOrderNumber(order.number)}. ${total}`;
}
