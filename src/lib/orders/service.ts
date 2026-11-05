import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { generateAccessKey } from "@/lib/orders/access";
import { priceOrder, type CurrentVariant, type PricingResult, type RequestedLine } from "@/lib/orders/pricing";
import { assertTransition, type OrderStatusId } from "@/lib/orders/status";
import { reserveStock, restoreStock } from "@/lib/orders/stock";
import type { PaymentMethodId } from "@/lib/payments/methods";

export async function currentVariants(skus: string[]): Promise<Map<string, CurrentVariant>> {
  const rows = await prisma.productVariant.findMany({
    where: { sku: { in: [...new Set(skus)] } },
    select: {
      id: true,
      sku: true,
      label: true,
      priceKobo: true,
      stockQty: true,
      product: { select: { name: true, slug: true, active: true } },
    },
  });
  return new Map(
    rows.map((row) => [
      row.sku,
      {
        id: row.id,
        sku: row.sku,
        label: row.label,
        priceKobo: row.priceKobo,
        stockQty: row.stockQty,
        productName: row.product.name,
        productSlug: row.product.slug,
        productActive: row.product.active,
      },
    ]),
  );
}

export async function priceRequestedLines(lines: RequestedLine[]): Promise<PricingResult> {
  return priceOrder(lines, await currentVariants(lines.map((line) => line.sku)));
}

export type NewOrder = {
  customerId: string | null;
  customerName: string;
  email: string;
  phone: string;
  phoneNormalized: string;
  state: string;
  city: string;
  street: string;
  landmark: string;
  notes: string | null;
  paymentMethod: PaymentMethodId;
  lines: RequestedLine[];
};

export type CreateOrderResult =
  | { ok: true; orderId: string; number: number; accessKey: string }
  | { ok: false; pricing: Extract<PricingResult, { ok: false }> };

/**
 * Prices the order from the database and reserves stock in one transaction. If anything changed
 * since the shopper's cart was loaded (price, stock, availability), nothing is saved.
 */
export async function createOrder(input: NewOrder): Promise<CreateOrderResult> {
  const pricing = await priceRequestedLines(input.lines);
  if (!pricing.ok) return { ok: false, pricing };

  const accessKey = generateAccessKey();
  const order = await prisma.$transaction(async (tx) => {
    await reserveStock(tx, pricing.lines);
    return tx.order.create({
      data: {
        status: "AWAITING_DELIVERY_QUOTE",
        paymentMethod: input.paymentMethod,
        customerId: input.customerId,
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        phoneNormalized: input.phoneNormalized,
        state: input.state,
        city: input.city,
        street: input.street,
        landmark: input.landmark,
        notes: input.notes,
        subtotalKobo: pricing.subtotalKobo,
        accessKey,
        items: {
          create: pricing.lines.map((line) => ({
            variantId: line.variantId,
            productName: line.productName,
            productSlug: line.productSlug,
            variantLabel: line.variantLabel,
            sku: line.sku,
            unitPriceKobo: line.unitPriceKobo,
            quantity: line.quantity,
          })),
        },
        events: { create: { toStatus: "AWAITING_DELIVERY_QUOTE", actor: "CUSTOMER", note: "Order placed" } },
      },
      select: { id: true, number: true },
    });
  });
  return { ok: true, orderId: order.id, number: order.number, accessKey };
}

export class OrderConflictError extends Error {
  constructor() {
    super("This order was just updated by someone else. Reload the page and try again.");
    this.name = "OrderConflictError";
  }
}

export type Actor = { type: "ADMIN" | "CUSTOMER" | "SYSTEM"; email?: string | null };

/**
 * Moves an order to a new status if the rules allow it, recording who did it. The update only
 * applies if the order is still in the status that was checked, so two admins can't clash.
 * Cancelling puts the reserved stock back.
 */
export async function transitionOrder(
  orderId: string,
  to: OrderStatusId,
  actor: Actor,
  options: { note?: string | null; data?: Prisma.OrderUpdateManyMutationInput } = {},
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentMethod: true, items: { select: { variantId: true, quantity: true } } },
  });
  if (!order) throw new Error("Order not found.");
  assertTransition(order.status, to, order.paymentMethod);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        ...options.data,
        status: to,
        ...(to === "PAID" && { paidAt: now }),
        ...(to === "CANCELLED" && { cancelledAt: now }),
      },
    });
    if (count !== 1) throw new OrderConflictError();
    if (to === "CANCELLED") await restoreStock(tx, order.items);
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: to,
        actor: actor.type,
        actorEmail: actor.email ?? null,
        note: options.note?.trim() || null,
      },
    });
  });
  return { from: order.status, to };
}
