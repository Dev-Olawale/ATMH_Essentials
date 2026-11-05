"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { trackingMatches } from "@/lib/orders/access";
import { formatOrderNumber, parseOrderNumber } from "@/lib/orders/status";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type TrackState = { error?: string };

const NOT_FOUND = "We couldn't find an order with that number and phone. Check both and try again.";

/** Guest tracking: the order number and the phone number on the order must both match. */
export async function trackOrder(_state: TrackState, formData: FormData): Promise<TrackState> {
  const number = parseOrderNumber(String(formData.get("number") ?? ""));
  const phone = String(formData.get("phone") ?? "").slice(0, 30);
  if (number === null || !phone.trim()) return { error: "Enter your order number and phone number." };
  // Stops guessing phone numbers for someone else's order.
  if (!(await rateLimit("track", await clientIp(), 10, 10 * 60))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const order = await prisma.order.findUnique({
    where: { number },
    select: { number: true, phone: true, accessKey: true },
  });
  // Same answer whether the order is missing or the phone is wrong.
  if (!order || !trackingMatches(order, phone)) return { error: NOT_FOUND };
  redirect(`/order/${formatOrderNumber(order.number)}?key=${encodeURIComponent(order.accessKey)}`);
}
