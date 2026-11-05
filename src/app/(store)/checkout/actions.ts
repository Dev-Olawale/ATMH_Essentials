"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { ensureCustomer, getCustomerUser } from "@/lib/auth/customer";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import { isNigerianState, normalizePhone } from "@/lib/nigeria";
import { notifyOrder } from "@/lib/orders/notify";
import { describeProblem, validRequestedLines } from "@/lib/orders/pricing";
import { createOrder } from "@/lib/orders/service";
import { formatOrderNumber } from "@/lib/orders/status";
import { OutOfStockError } from "@/lib/orders/stock";
import { availablePaymentMethods } from "@/lib/payments/methods";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getPublicSettings } from "@/lib/settings";

export type PlaceOrderResult =
  | { ok: true; url: string }
  | { ok: false; errors: string[]; /** The cart is out of date; refresh it from the store. */ resync?: boolean };

const orderInput = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.email("Enter a valid email address").max(254),
  phone: z.string().trim().max(30),
  state: z.string().refine(isNigerianState, "Choose your state"),
  city: z.string().trim().min(2, "Enter your city or LGA").max(80),
  street: z.string().trim().min(5, "Enter your street address").max(200),
  landmark: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(500).default(""),
  paymentMethod: z.enum(["BANK_TRANSFER", "PAY_ON_DELIVERY", "PAYSTACK"]),
  saveAddress: z.boolean().default(false),
  /** Honeypot: hidden from people, often filled in by bots. */
  website: z.string().max(200).default(""),
  lines: z.unknown(),
});

export type PlaceOrderInput = z.input<typeof orderInput>;

const GENERIC = "We couldn't place your order. Please try again, or message us on WhatsApp.";

export async function placeOrder(raw: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = orderInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] };
  }
  const input = parsed.data;
  if (input.website) return { ok: false, errors: [GENERIC] };

  const phoneNormalized = normalizePhone(input.phone);
  if (!phoneNormalized) return { ok: false, errors: ["Enter a valid phone number, e.g. 0803 123 4567"] };
  if (!validRequestedLines(input.lines)) {
    return { ok: false, errors: ["Your cart looks empty or out of date. Please check it and try again."], resync: true };
  }

  // Bot protection: a few orders per device and per phone number in a short time.
  const [byIp, byPhone] = await Promise.all([
    rateLimit("order-ip", await clientIp(), 5, 10 * 60),
    rateLimit("order-phone", phoneNormalized, 5, 60 * 60),
  ]);
  if (!byIp || !byPhone) {
    return { ok: false, errors: ["Too many orders in a short time. Please wait a few minutes, or message us on WhatsApp."] };
  }

  const settings = await getPublicSettings();
  if (!availablePaymentMethods(settings, input.state).some((method) => method.id === input.paymentMethod)) {
    return { ok: false, errors: ["That payment method isn't available for your state. Please choose another."] };
  }

  const user = await getCustomerUser();
  if (user) await ensureCustomer(user);

  let result;
  try {
    result = await createOrder({
      customerId: user?.id ?? null,
      customerName: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      phoneNormalized,
      state: input.state,
      city: input.city,
      street: input.street,
      landmark: input.landmark,
      notes: input.notes || null,
      paymentMethod: input.paymentMethod,
      lines: input.lines,
    });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return { ok: false, errors: ["Someone just bought the last of an item in your cart. Please check your cart."], resync: true };
    }
    throw error;
  }
  if (!result.ok) {
    return { ok: false, errors: result.pricing.problems.map(describeProblem), resync: true };
  }

  if (user && input.saveAddress) {
    const hasDefault = await prisma.address.count({ where: { customerId: user.id, isDefault: true } });
    await prisma.address.create({
      data: {
        customerId: user.id,
        state: input.state,
        city: input.city,
        street: input.street,
        landmark: input.landmark,
        isDefault: hasDefault === 0,
      },
    });
    await prisma.customer.updateMany({
      where: { id: user.id, name: "" },
      data: { name: input.name },
    });
    await prisma.customer.updateMany({
      where: { id: user.id, phone: "" },
      data: { phone: input.phone },
    });
  }

  updateTag(CATALOG_TAG); // stock changed
  const orderId = result.orderId;
  after(() => Promise.all([notifyOrder(orderId, "order-received"), notifyOrder(orderId, "admin-new-order")]));

  const key = encodeURIComponent(result.accessKey);
  return { ok: true, url: `/order/${formatOrderNumber(result.number)}?key=${key}&placed=1` };
}
