import "server-only";

import { getCustomerUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/db";
import { canViewOrder } from "@/lib/orders/access";
import { parseOrderNumber } from "@/lib/orders/status";

/**
 * Loads an order for a shopper: the signed-in customer who placed it, or anyone with the order's
 * secret link key. Returns null otherwise, so the caller shows "not found" and reveals nothing.
 */
export async function loadOrderForViewer(numberText: string, key: string | null | undefined) {
  const number = parseOrderNumber(numberText);
  if (number === null) return null;
  const [order, user] = await Promise.all([
    prisma.order.findUnique({
      where: { number },
      include: {
        items: { orderBy: { id: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        paymentProofs: { orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, reference: true, reviewedAt: true, createdAt: true } },
      },
    }),
    getCustomerUser(),
  ]);
  if (!order || !canViewOrder(order, { customerId: user?.id, key })) return null;
  return { order, viewerIsOwner: Boolean(user && order.customerId === user.id) };
}
