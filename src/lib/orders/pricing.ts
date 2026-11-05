import { MAX_LINE_QTY } from "@/lib/cart";

/** What the shopper's browser sends: what they want, and the price they were shown. */
export type RequestedLine = { sku: string; qty: number; priceKobo: number };

/** The variant as it is in the database right now. */
export type CurrentVariant = {
  id: string;
  sku: string;
  label: string;
  priceKobo: number;
  stockQty: number;
  productName: string;
  productSlug: string;
  productActive: boolean;
};

export type PricedLine = {
  variantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  unitPriceKobo: number;
  quantity: number;
};

export type PricingProblem =
  | { kind: "unavailable"; sku: string; name?: string }
  | { kind: "out-of-stock"; sku: string; name: string; available: number }
  | { kind: "price-changed"; sku: string; name: string; was: number; now: number };

export type PricingResult =
  | { ok: true; lines: PricedLine[]; subtotalKobo: number }
  | { ok: false; problems: PricingProblem[] };

export const MAX_ORDER_LINES = 50;

/**
 * Prices an order from the database only. The browser's prices are used for one thing:
 * if they differ from today's prices, the order is refused so the shopper can review the change.
 */
export function priceOrder(requested: RequestedLine[], current: Map<string, CurrentVariant>): PricingResult {
  const problems: PricingProblem[] = [];
  const lines: PricedLine[] = [];
  const merged = new Map<string, RequestedLine>();
  for (const line of requested) {
    const existing = merged.get(line.sku);
    merged.set(line.sku, existing ? { ...line, qty: existing.qty + line.qty } : line);
  }

  for (const line of merged.values()) {
    const variant = current.get(line.sku);
    if (!variant || !variant.productActive) {
      problems.push({ kind: "unavailable", sku: line.sku, name: variant?.productName });
      continue;
    }
    if (variant.stockQty < line.qty) {
      problems.push({ kind: "out-of-stock", sku: line.sku, name: variant.productName, available: variant.stockQty });
      continue;
    }
    if (variant.priceKobo !== line.priceKobo) {
      problems.push({
        kind: "price-changed",
        sku: line.sku,
        name: variant.productName,
        was: line.priceKobo,
        now: variant.priceKobo,
      });
      continue;
    }
    lines.push({
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.productName,
      productSlug: variant.productSlug,
      variantLabel: variant.label,
      unitPriceKobo: variant.priceKobo,
      quantity: line.qty,
    });
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, lines, subtotalKobo: lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0) };
}

/** Basic shape checks before anything touches the database. */
export function validRequestedLines(lines: unknown): lines is RequestedLine[] {
  return (
    Array.isArray(lines) &&
    lines.length > 0 &&
    lines.length <= MAX_ORDER_LINES &&
    lines.every(
      (line) =>
        typeof line === "object" &&
        line !== null &&
        typeof line.sku === "string" &&
        line.sku.length <= 64 &&
        Number.isSafeInteger(line.qty) &&
        line.qty >= 1 &&
        line.qty <= MAX_LINE_QTY &&
        Number.isSafeInteger(line.priceKobo) &&
        line.priceKobo >= 0,
    )
  );
}

export function describeProblem(problem: PricingProblem): string {
  switch (problem.kind) {
    case "unavailable":
      return `${problem.name ?? "An item"} is no longer available.`;
    case "out-of-stock":
      return problem.available === 0
        ? `${problem.name} is now out of stock.`
        : `Only ${problem.available} of ${problem.name} left in stock.`;
    case "price-changed":
      return `The price of ${problem.name} has changed.`;
  }
}
