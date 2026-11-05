import { describe, expect, it } from "vitest";

import { priceOrder, validRequestedLines, type CurrentVariant } from "@/lib/orders/pricing";

const variant = (sku: string, priceKobo: number, stockQty: number, active = true): CurrentVariant => ({
  id: `id-${sku}`,
  sku,
  label: "500ml",
  priceKobo,
  stockQty,
  productName: `Product ${sku}`,
  productSlug: sku.toLowerCase(),
  productActive: active,
});
const db = new Map([
  ["A", variant("A", 250_000, 10)],
  ["B", variant("B", 99_950, 2)],
  ["GONE", variant("GONE", 100_000, 5, false)],
]);

describe("priceOrder", () => {
  it("prices from the database and totals in kobo", () => {
    const result = priceOrder(
      [
        { sku: "A", qty: 3, priceKobo: 250_000 },
        { sku: "B", qty: 2, priceKobo: 99_950 },
      ],
      db,
    );
    expect(result).toMatchObject({ ok: true, subtotalKobo: 3 * 250_000 + 2 * 99_950 });
  });

  it("rejects a tampered (lower) price instead of charging it", () => {
    const result = priceOrder([{ sku: "A", qty: 1, priceKobo: 100 }], db);
    expect(result).toEqual({
      ok: false,
      problems: [{ kind: "price-changed", sku: "A", name: "Product A", was: 100, now: 250_000 }],
    });
  });

  it("rejects a higher stale price too, so shoppers are never overcharged silently", () => {
    expect(priceOrder([{ sku: "A", qty: 1, priceKobo: 300_000 }], db).ok).toBe(false);
  });

  it("rejects more than is in stock, counting repeated lines together", () => {
    const result = priceOrder(
      [
        { sku: "B", qty: 2, priceKobo: 99_950 },
        { sku: "B", qty: 1, priceKobo: 99_950 },
      ],
      db,
    );
    expect(result).toEqual({
      ok: false,
      problems: [{ kind: "out-of-stock", sku: "B", name: "Product B", available: 2 }],
    });
  });

  it("rejects unknown and archived products", () => {
    const result = priceOrder(
      [
        { sku: "NOPE", qty: 1, priceKobo: 1 },
        { sku: "GONE", qty: 1, priceKobo: 100_000 },
      ],
      db,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problems.map((p) => p.kind)).toEqual(["unavailable", "unavailable"]);
  });
});

describe("validRequestedLines", () => {
  it("accepts a normal cart", () => {
    expect(validRequestedLines([{ sku: "A", qty: 1, priceKobo: 100 }])).toBe(true);
  });

  it.each([
    [[]],
    [null],
    [[{ sku: "A", qty: 0, priceKobo: 100 }]],
    [[{ sku: "A", qty: 1.5, priceKobo: 100 }]],
    [[{ sku: "A", qty: 100, priceKobo: 100 }]],
    [[{ sku: "A", qty: 1, priceKobo: -1 }]],
    [[{ sku: "A", qty: 1, priceKobo: "100" }]],
    [Array.from({ length: 51 }, (_, i) => ({ sku: `S${i}`, qty: 1, priceKobo: 1 }))],
  ])("rejects malformed input %#", (lines) => {
    expect(validRequestedLines(lines)).toBe(false);
  });
});
