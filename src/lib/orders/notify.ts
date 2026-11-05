import "server-only";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { renderOrderEmail, type OrderEmailKind } from "@/lib/email/templates";
import { formatOrderNumber } from "@/lib/orders/status";
import { bankDetailsFrom, getPrivateSettings } from "@/lib/settings";
import { resolveSiteUrl } from "@/lib/site-url";

/** Alerts go to the emails in Settings, or to every owner when none are set. */
async function adminRecipients(notificationEmails: string[]): Promise<string[]> {
  if (notificationEmails.length > 0) return notificationEmails;
  const owners = await prisma.adminUser.findMany({ where: { role: "OWNER" }, select: { email: true } });
  return owners.map((owner) => owner.email);
}

/**
 * Sends one order email. Call it inside `after()` so the shopper or admin isn't kept waiting.
 * Failures are logged by template name only and never undo the order change.
 */
export async function notifyOrder(orderId: string, kind: OrderEmailKind, extra: { cancelReason?: string } = {}) {
  try {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }),
      getPrivateSettings(),
    ]);
    if (!order) return;
    const site = resolveSiteUrl();
    const forAdmin = kind.startsWith("admin-");
    const email = renderOrderEmail(kind, {
      number: order.number,
      customerName: order.customerName,
      customerEmail: order.email,
      customerPhone: order.phone,
      paymentMethod: order.paymentMethod,
      subtotalKobo: order.subtotalKobo,
      deliveryFeeKobo: order.deliveryFeeKobo,
      totalKobo: order.totalKobo,
      state: order.state,
      city: order.city,
      street: order.street,
      landmark: order.landmark,
      items: order.items,
      link: forAdmin
        ? `${site}/admin/orders/${order.id}`
        : `${site}/order/${formatOrderNumber(order.number)}?key=${encodeURIComponent(order.accessKey)}`,
      whatsappNumber: settings.whatsappNumber,
      bank: bankDetailsFrom(settings),
      riderName: order.riderName,
      riderPhone: order.riderPhone,
      dispatchNote: order.dispatchNote,
      cancelReason: extra.cancelReason,
    });
    const to = forAdmin ? await adminRecipients(settings.notificationEmails) : [order.email];
    await sendEmail(kind, to, email);
  } catch (error) {
    console.error(`[email] could not prepare "${kind}"`, (error as Error).name);
  }
}

/** The status changes that email the customer. */
export const CUSTOMER_EMAIL_FOR_STATUS: Partial<Record<string, OrderEmailKind>> = {
  PAID: "payment-confirmed",
  OUT_FOR_DELIVERY: "out-for-delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};
