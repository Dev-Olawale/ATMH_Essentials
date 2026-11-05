import { describe, expect, it } from "vitest";

import { canViewOrder, generateAccessKey, trackingMatches } from "@/lib/orders/access";

const order = { customerId: "customer-a", accessKey: generateAccessKey(), phone: "0811 633 6407" };

describe("canViewOrder", () => {
  it("lets the customer who placed it see it", () => {
    expect(canViewOrder(order, { customerId: "customer-a" })).toBe(true);
  });

  it("does not let another signed-in customer see it", () => {
    expect(canViewOrder(order, { customerId: "customer-b" })).toBe(false);
    expect(canViewOrder(order, { customerId: "customer-b", key: "guess" })).toBe(false);
  });

  it("lets anyone holding the order link see it (guest checkout)", () => {
    expect(canViewOrder({ ...order, customerId: null }, { key: order.accessKey })).toBe(true);
  });

  it("rejects wrong, empty or near-miss keys", () => {
    const guest = { ...order, customerId: null };
    for (const key of ["", null, undefined, order.accessKey.slice(1), `${order.accessKey}x`, order.accessKey.toUpperCase()]) {
      expect(canViewOrder(guest, { key }), String(key)).toBe(false);
    }
    expect(canViewOrder(guest, { customerId: null })).toBe(false);
  });

  it("generates long, unique keys", () => {
    const keys = new Set(Array.from({ length: 100 }, generateAccessKey));
    expect(keys.size).toBe(100);
    expect([...keys].every((key) => key.length >= 32)).toBe(true);
  });
});

describe("trackingMatches", () => {
  it("requires the phone number on the order", () => {
    expect(trackingMatches(order, "+234 811 633 6407")).toBe(true);
    expect(trackingMatches(order, "08116336408")).toBe(false);
    expect(trackingMatches(order, "")).toBe(false);
  });
});
