"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import { nairaToKobo } from "@/lib/money";
import { normalizePhone } from "@/lib/nigeria";
import { CUSTOMER_EMAIL_FOR_STATUS, notifyOrder } from "@/lib/orders/notify";
import { OrderConflictError, transitionOrder } from "@/lib/orders/service";
import { canSetDeliveryFee, InvalidTransitionError, statusAfterQuote, type OrderStatusId } from "@/lib/orders/status";

export type OrderActionResult = { ok: true } | { ok: false; error: string };

function failure(error: unknown): OrderActionResult {
  if (error instanceof InvalidTransitionError || error instanceof OrderConflictError) {
    return { ok: false, error: error.message };
  }
  throw error;
}

/** Moves an order on and emails the customer where that status has an email. */
async function move(
  orderId: string,
  to: OrderStatusId,
  email: string,
  options: Parameters<typeof transitionOrder>[3] = {},
): Promise<OrderActionResult> {
  try {
    await transitionOrder(String(orderId), to, { type: "ADMIN", email }, options);
  } catch (error) {
    return failure(error);
  }
  const kind = CUSTOMER_EMAIL_FOR_STATUS[to];
  if (kind) after(() => notifyOrder(String(orderId), kind, { cancelReason: options.note ?? undefined }));
  return { ok: true };
}

/**
 * The rider's quote. The first time, the order moves on (bank transfer → awaiting payment,
 * pay on delivery → confirmed). It can be corrected until the order is paid or packed.
 * Either way the customer is emailed the final total (with bank details for transfers).
 */
export async function setDeliveryFee(orderId: string, feeNaira: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const fee = nairaToKobo(String(feeNaira));
  if (fee === null) return { ok: false, error: "Enter the delivery fee in naira, e.g. 2500 (0 for free delivery)." };
  const order = await prisma.order.findUnique({
    where: { id: String(orderId) },
    select: { id: true, status: true, paymentMethod: true, subtotalKobo: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!canSetDeliveryFee(order.status)) {
    return { ok: false, error: "The delivery fee can't be changed after the order is paid or packed." };
  }
  const data = { deliveryFeeKobo: fee, totalKobo: order.subtotalKobo + fee, quotedAt: new Date() };

  if (order.status === "AWAITING_DELIVERY_QUOTE") {
    try {
      await transitionOrder(order.id, statusAfterQuote(order.paymentMethod), { type: "ADMIN", email: admin.email }, {
        data,
        note: `Delivery fee set`,
      });
    } catch (error) {
      return failure(error);
    }
  } else {
    const { count } = await prisma.order.updateMany({ where: { id: order.id, status: order.status }, data });
    if (count !== 1) return { ok: false, error: new OrderConflictError().message };
    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actor: "ADMIN",
        actorEmail: admin.email,
        note: "Delivery fee changed",
      },
    });
  }
  after(() => notifyOrder(order.id, "total-confirmed"));
  return { ok: true };
}

/** Bank transfer received (checked in the bank app). Marks any receipts as reviewed. */
export async function markPaid(orderId: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const result = await move(orderId, "PAID", admin.email);
  if (result.ok) {
    await prisma.paymentProof.updateMany({
      where: { orderId: String(orderId), reviewedAt: null },
      data: { reviewedAt: new Date(), reviewedBy: admin.email },
    });
  }
  return result;
}

export async function markPacked(orderId: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  return move(orderId, "PACKED", admin.email);
}

const dispatchInput = z.object({
  riderName: z.string().trim().min(2, "Enter the rider's name").max(80),
  riderPhone: z.string().trim().max(30),
  note: z.string().trim().max(300),
});

export async function dispatchOrder(
  orderId: string,
  input: z.input<typeof dispatchInput>,
): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const parsed = dispatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!normalizePhone(parsed.data.riderPhone)) return { ok: false, error: "Enter the rider's phone number." };
  return move(orderId, "OUT_FOR_DELIVERY", admin.email, {
    data: { riderName: parsed.data.riderName, riderPhone: parsed.data.riderPhone, dispatchNote: parsed.data.note || null },
    note: parsed.data.note || null,
  });
}

/** Delivered. For pay on delivery, the rider collected the money, so it is recorded as paid too. */
export async function markDelivered(orderId: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: String(orderId) }, select: { paidAt: true } });
  return move(orderId, "DELIVERED", admin.email, { data: order && !order.paidAt ? { paidAt: new Date() } : {} });
}

/** Cancels an open order and puts its items back in stock. */
export async function cancelOrder(orderId: string, reason: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const note = String(reason ?? "").trim().slice(0, 300);
  if (note.length < 3) return { ok: false, error: "Add a short reason; the customer sees it." };
  const result = await move(orderId, "CANCELLED", admin.email, { note });
  if (result.ok) updateTag(CATALOG_TAG); // stock went back up
  return result;
}
