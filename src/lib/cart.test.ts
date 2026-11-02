import { describe, expect, it } from "vitest";

import {
  addLine,
  cartCount,
  cartSubtotalKobo,
  lineTotalKobo,
  MAX_LINE_QTY,
  removeLine,
  sanitizeLines,
  setLineQty,
  type CartLine,
} from "@/lib/cart";

const soap: CartLine = {
  sku: "SOAP",
  slug: "soap",
  name: "Soap",
  variantLabel: "150g",
  priceKobo: 60_000,
  qty: 1,
  maxQty: 10,
  icon: "SprayCan",
};
const foil: CartLine = { ...soap, sku: "FOIL", slug: "foil", name: "Foil", priceKobo: 250_050 };

describe("totals", () => {
  it("is zero for an empty cart", () => {
    expect(cartCount([])).toBe(0);
    expect(cartSubtotalKobo([])).toBe(0);
  });

  it("sums price x qty across lines in integer kobo", () => {
    const lines = addLine(addLine([], soap, 3), foil, 2);
    expect(lineTotalKobo(lines[0])).toBe(180_000);
    expect(cartCount(lines)).toBe(5);
    expect(cartSubtotalKobo(lines)).toBe(680_100);
    expect(Number.isInteger(cartSubtotalKobo(lines))).toBe(true);
  });

  it("does not drift the way naira decimals would", () => {
    const line = { ...soap, priceKobo: 10, maxQty: 99 };
    expect(cartSubtotalKobo(addLine([], { ...line, sku: "A" }, 3))).toBe(30);
    expect(0.1 * 3).not.toBe(0.3);
  });
});

describe("addLine", () => {
  it("merges repeat adds of the same sku", () => {
    const lines = addLine(addLine([], soap, 2), soap, 3);
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(5);
  });

  it("keeps different variants as separate lines", () => {
    expect(addLine(addLine([], soap), foil)).toHaveLength(2);
  });

  it("caps at available stock", () => {
    expect(addLine([], soap, 50)[0].qty).toBe(10);
    expect(addLine(addLine([], soap, 8), soap, 5)[0].qty).toBe(10);
  });

  it("caps at the per-line maximum when stock is higher", () => {
    expect(addLine([], { ...soap, maxQty: 500 }, 500)[0].qty).toBe(MAX_LINE_QTY);
  });

  it("refuses out-of-stock items", () => {
    expect(addLine([], { ...soap, maxQty: 0 })).toEqual([]);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])("ignores a quantity of %s", (qty) => {
    expect(addLine([], soap, qty)).toEqual([]);
  });

  it("rounds fractional quantities down", () => {
    expect(addLine([], soap, 2.9)[0].qty).toBe(2);
  });

  it("refreshes the snapshot when re-adding", () => {
    const lines = addLine(addLine([], soap), { ...soap, priceKobo: 70_000 });
    expect(lines[0].priceKobo).toBe(70_000);
  });

  it("does not mutate its input", () => {
    const lines = addLine([], soap);
    addLine(lines, soap);
    expect(lines[0].qty).toBe(1);
  });
});

describe("setLineQty", () => {
  const lines = addLine(addLine([], soap, 2), foil);

  it("updates only the matching line", () => {
    const next = setLineQty(lines, "SOAP", 4);
    expect(next[0].qty).toBe(4);
    expect(next[1].qty).toBe(1);
  });

  it("caps at stock", () => {
    expect(setLineQty(lines, "SOAP", 999)[0].qty).toBe(10);
  });

  it.each([0, -1, 0.5])("removes the line for a quantity of %s", (qty) => {
    expect(setLineQty(lines, "SOAP", qty).map((line) => line.sku)).toEqual(["FOIL"]);
  });

  it("ignores non-numeric input", () => {
    expect(setLineQty(lines, "SOAP", Number.NaN)).toBe(lines);
  });

  it("leaves the cart unchanged for an unknown sku", () => {
    expect(setLineQty(lines, "NOPE", 3)).toEqual(lines);
  });
});

describe("removeLine", () => {
  it("removes only the matching line", () => {
    const lines = addLine(addLine([], soap), foil);
    expect(removeLine(lines, "SOAP").map((line) => line.sku)).toEqual(["FOIL"]);
  });
});

describe("sanitizeLines", () => {
  it.each([null, undefined, "x", 4, {}])("returns an empty cart for %s", (value) => {
    expect(sanitizeLines(value)).toEqual([]);
  });

  it("drops malformed lines and keeps valid ones", () => {
    const lines = sanitizeLines([
      soap,
      { sku: "BAD" },
      { ...foil, priceKobo: 12.5 },
      { ...foil, priceKobo: -5 },
      { ...foil, qty: "2" },
      null,
    ]);
    expect(lines.map((line) => line.sku)).toEqual(["SOAP"]);
  });

  it("merges duplicates and re-applies limits", () => {
    const lines = sanitizeLines([{ ...soap, qty: 8 }, { ...soap, qty: 8 }, { ...foil, qty: -1 }]);
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(10);
  });
});
