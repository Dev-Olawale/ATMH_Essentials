import { randomBytes, timingSafeEqual } from "node:crypto";

import { phonesMatch } from "@/lib/nigeria";

/** The secret in an order link. 24 random bytes: not guessable. */
export function generateAccessKey(): string {
  return randomBytes(24).toString("base64url");
}

export type OrderViewer = {
  /** Signed-in shopper's id, if any. */
  customerId?: string | null;
  /** The ?key= from the order link, if any. */
  key?: string | null;
};

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * A shopper may see an order if it is on their account, or if they hold the order's link.
 * Nobody else can, including other signed-in shoppers.
 */
export function canViewOrder(
  order: { customerId: string | null; accessKey: string },
  viewer: OrderViewer,
): boolean {
  if (viewer.customerId && order.customerId && viewer.customerId === order.customerId) return true;
  return Boolean(viewer.key) && sameSecret(viewer.key!, order.accessKey);
}

/** Guest tracking: the phone number must match the one on the order. */
export function trackingMatches(order: { phone: string }, phone: string): boolean {
  return phonesMatch(order.phone, phone);
}
