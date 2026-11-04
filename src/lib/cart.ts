import type { CategoryIconName } from "@/components/category-icon";
import type { Product, ProductVariant } from "@/lib/catalog-types";

export const MAX_LINE_QTY = 99;

/**
 * A snapshot of the variant at the time it was added. Prices here are for display only:
 * checkout must recalculate them on the server.
 */
export type CartLine = {
  sku: string;
  slug: string;
  name: string;
  variantLabel: string;
  priceKobo: number;
  qty: number;
  maxQty: number;
  icon: CategoryIconName;
};

export function toCartLine(
  product: Product,
  variant: ProductVariant,
  icon: CategoryIconName,
): CartLine {
  return {
    sku: variant.sku,
    slug: product.slug,
    name: product.name,
    variantLabel: variant.label,
    priceKobo: variant.priceKobo,
    qty: 1,
    maxQty: variant.stockQty,
    icon,
  };
}

function lineLimit(maxQty: number): number {
  return Math.min(maxQty, MAX_LINE_QTY);
}

export function addLine(lines: CartLine[], line: CartLine, qty = 1): CartLine[] {
  if (!Number.isFinite(qty) || qty < 1 || lineLimit(line.maxQty) < 1) return lines;
  const wanted = Math.floor(qty);
  const existing = lines.find((current) => current.sku === line.sku);

  if (!existing) {
    return [...lines, { ...line, qty: Math.min(wanted, lineLimit(line.maxQty)) }];
  }
  return lines.map((current) =>
    current.sku === line.sku
      ? {
          ...line,
          qty: Math.min(current.qty + wanted, lineLimit(line.maxQty)),
        }
      : current,
  );
}

/** Quantities of zero or below remove the line. Non-numeric input is ignored. */
export function setLineQty(lines: CartLine[], sku: string, qty: number): CartLine[] {
  if (!Number.isFinite(qty)) return lines;
  const wanted = Math.floor(qty);
  if (wanted <= 0) return removeLine(lines, sku);
  return lines.map((line) =>
    line.sku === sku ? { ...line, qty: Math.min(wanted, lineLimit(line.maxQty)) } : line,
  );
}

export function removeLine(lines: CartLine[], sku: string): CartLine[] {
  return lines.filter((line) => line.sku !== sku);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.qty, 0);
}

export function lineTotalKobo(line: CartLine): number {
  return line.priceKobo * line.qty;
}

export function cartSubtotalKobo(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + lineTotalKobo(line), 0);
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.sku === "string" &&
    typeof line.slug === "string" &&
    typeof line.name === "string" &&
    typeof line.variantLabel === "string" &&
    typeof line.icon === "string" &&
    Number.isSafeInteger(line.priceKobo) &&
    (line.priceKobo as number) >= 0 &&
    Number.isFinite(line.qty) &&
    Number.isSafeInteger(line.maxQty)
  );
}

/** Rebuilds a cart from untrusted storage, dropping anything malformed. */
export function sanitizeLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isCartLine).reduce<CartLine[]>((lines, line) => addLine(lines, line, line.qty), []);
}

/** The current state of a variant, as returned by /api/cart. */
export type FreshVariant = Omit<CartLine, "qty" | "maxQty"> & { stockQty: number };

export type CartReconciliation = {
  lines: CartLine[];
  /** Names of items dropped because they were removed from the store or sold out. */
  removed: string[];
  /** True when any price, name or available quantity changed. */
  changed: boolean;
};

/**
 * Brings a saved cart in line with the store: drops items that no longer exist or are sold out,
 * refreshes prices and names, and caps quantities at what is in stock.
 */
export function reconcileCart(
  lines: CartLine[],
  fresh: Map<string, FreshVariant>,
): CartReconciliation {
  const removed: string[] = [];
  let changed = false;
  const next: CartLine[] = [];

  for (const line of lines) {
    const current = fresh.get(line.sku);
    if (!current || current.stockQty < 1) {
      removed.push(line.name);
      continue;
    }
    const { stockQty, ...details } = current;
    const updated: CartLine = {
      ...details,
      qty: Math.min(line.qty, lineLimit(stockQty)),
      maxQty: stockQty,
    };
    if (
      updated.priceKobo !== line.priceKobo ||
      updated.name !== line.name ||
      updated.variantLabel !== line.variantLabel ||
      updated.qty !== line.qty
    ) {
      changed = true;
    }
    next.push(updated);
  }
  return { lines: next, removed, changed };
}
