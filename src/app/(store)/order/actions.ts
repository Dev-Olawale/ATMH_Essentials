"use server";

import { after } from "next/server";
import { z } from "zod";

import { getCustomerUser } from "@/lib/auth/customer";
import type { CartLine } from "@/lib/cart";
import { getCatalog } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import { notifyOrder } from "@/lib/orders/notify";
import { parseOrderNumber } from "@/lib/orders/status";
import { loadOrderForViewer } from "@/lib/orders/viewer";
import { rateLimit } from "@/lib/rate-limit";

const referenceInput = z.object({
  number: z.string().max(20),
  key: z.string().max(100).nullable(),
  reference: z.string().trim().min(4, "Enter the reference from your bank").max(120),
});

/** A bank-transfer reference typed by the shopper, for an admin to check. */
export async function submitPaymentReference(raw: z.input<typeof referenceInput>) {
  const parsed = referenceInput.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const found = await loadOrderForViewer(parsed.data.number, parsed.data.key);
  if (!found) return { ok: false as const, error: "Order not found." };
  const { order } = found;
  if (order.paymentMethod !== "BANK_TRANSFER" || order.status !== "AWAITING_PAYMENT") {
    return { ok: false as const, error: "This order isn't waiting for a bank transfer." };
  }
  if (!(await rateLimit("proof", order.id, 10, 60 * 60))) {
    return { ok: false as const, error: "Too many attempts. Please message us on WhatsApp." };
  }
  await prisma.paymentProof.create({ data: { orderId: order.id, reference: parsed.data.reference } });
  after(() => notifyOrder(order.id, "admin-payment-proof"));
  return { ok: true as const };
}

/**
 * One-tap reorder: the items of a past order that can still be bought, at today's prices,
 * capped at what's in stock. Only for the signed-in customer who placed it.
 */
export async function getReorderLines(numberText: string): Promise<{ lines: CartLine[]; skipped: string[] }> {
  const user = await getCustomerUser();
  const number = parseOrderNumber(String(numberText));
  if (!user || number === null) return { lines: [], skipped: [] };
  const order = await prisma.order.findFirst({
    where: { number, customerId: user.id },
    include: { items: true },
  });
  if (!order) return { lines: [], skipped: [] };

  const { products } = await getCatalog();
  const bySku = new Map(
    products.flatMap((product) => product.variants.map((variant) => [variant.sku, { product, variant }] as const)),
  );
  const lines: CartLine[] = [];
  const skipped: string[] = [];
  for (const item of order.items) {
    const match = bySku.get(item.sku);
    if (!match || match.variant.stockQty < 1) {
      skipped.push(item.productName);
      continue;
    }
    lines.push({
      sku: match.variant.sku,
      slug: match.product.slug,
      name: match.product.name,
      variantLabel: match.variant.label,
      priceKobo: match.variant.priceKobo,
      qty: Math.min(item.quantity, match.variant.stockQty),
      maxQty: match.variant.stockQty,
      icon: match.product.icon,
    });
  }
  return { lines, skipped };
}
