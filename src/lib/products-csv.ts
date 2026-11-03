import Papa from "papaparse";

import { slugify } from "@/lib/catalog-types";
import { koboToNairaInput, nairaToKobo } from "@/lib/money";

/**
 * Product CSV: one row per variant. Product columns repeat on each of its rows.
 * Required in every row: product_slug, product_name, variant_sku, variant_label, price_naira, stock.
 * Optional cells left blank keep the current value when updating, or use the default when creating.
 */
export const CSV_COLUMNS = [
  "product_slug",
  "product_name",
  "brand",
  "description",
  "categories",
  "tags",
  "featured",
  "active",
  "variant_sku",
  "variant_label",
  "price_naira",
  "compare_at_naira",
  "stock",
  "low_stock_threshold",
] as const;

type Column = (typeof CSV_COLUMNS)[number];
const REQUIRED: Column[] = [
  "product_slug",
  "product_name",
  "variant_sku",
  "variant_label",
  "price_naira",
  "stock",
];

export const MAX_IMPORT_ROWS = 5000;

export type ImportVariant = {
  line: number;
  sku: string;
  label: string;
  priceKobo: number;
  /** undefined = keep current (or none when creating). */
  compareAtKobo?: number;
  stockQty: number;
  lowStockThreshold?: number;
};

export type ImportProduct = {
  line: number;
  slug: string;
  name: string;
  brand?: string;
  description?: string;
  /** Category ids, primary first. undefined = keep current. */
  categoryIds?: string[];
  tags?: string[];
  featured?: boolean;
  active?: boolean;
  variants: ImportVariant[];
};

export type ImportIssue = { line: number; message: string };

export type ParsedImport = { products: ImportProduct[]; errors: ImportIssue[] };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function parseBoolean(value: string): boolean | null | undefined {
  const v = value.trim().toLowerCase();
  if (v === "") return undefined;
  if (["yes", "y", "true", "1"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  return null;
}

function parseWhole(value: string): number | null {
  const v = value.trim().replace(/,/g, "");
  return /^\d{1,9}$/.test(v) ? Number(v) : null;
}

function splitList(value: string): string[] {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Validates a product CSV. `categoryPaths` maps "root" and "root/subcategory" slugs to category ids.
 * Database checks (e.g. a SKU that belongs to another product) happen when the import runs.
 */
export function parseProductsCsv(text: string, categoryPaths: Map<string, string>): ParsedImport {
  const errors: ImportIssue[] = [];
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const headers = result.meta.fields ?? [];
  const missing = REQUIRED.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    return { products: [], errors: [{ line: 1, message: `Missing columns: ${missing.join(", ")}` }] };
  }
  const unknown = headers.filter((header) => !(CSV_COLUMNS as readonly string[]).includes(header));
  if (unknown.length > 0) {
    errors.push({ line: 1, message: `Unknown columns (ignored): ${unknown.join(", ")}` });
  }
  if (result.data.length === 0) {
    return { products: [], errors: [...errors, { line: 1, message: "The file has no product rows." }] };
  }
  if (result.data.length > MAX_IMPORT_ROWS) {
    return {
      products: [],
      errors: [{ line: 1, message: `Too many rows (${result.data.length}). The limit is ${MAX_IMPORT_ROWS}.` }],
    };
  }

  const bySlug = new Map<string, ImportProduct>();
  const seenSkus = new Map<string, number>();

  result.data.forEach((raw, index) => {
    const line = index + 2; // Line 1 is the header.
    const cell = (column: Column) => (raw[column] ?? "").trim();
    const rowErrors: string[] = [];

    const slug = cell("product_slug").toLowerCase() || slugify(cell("product_name"));
    if (!SLUG.test(slug)) rowErrors.push("product_slug must use lowercase letters, numbers and dashes");
    const name = cell("product_name");
    if (!name) rowErrors.push("product_name is required");

    const sku = cell("variant_sku");
    if (!SKU.test(sku)) rowErrors.push("variant_sku is required (letters, numbers, . _ -)");
    else if (seenSkus.has(sku.toUpperCase())) {
      rowErrors.push(`variant_sku ${sku} is repeated (first on line ${seenSkus.get(sku.toUpperCase())})`);
    }
    const label = cell("variant_label");
    if (!label) rowErrors.push("variant_label is required (e.g. 500ml)");

    const priceKobo = nairaToKobo(cell("price_naira"));
    if (priceKobo === null || priceKobo === 0) rowErrors.push("price_naira must be a positive amount");
    let compareAtKobo: number | undefined;
    if (cell("compare_at_naira")) {
      const value = nairaToKobo(cell("compare_at_naira"));
      if (value === null) rowErrors.push("compare_at_naira must be an amount");
      else if (priceKobo !== null && value <= priceKobo) {
        rowErrors.push("compare_at_naira must be higher than price_naira");
      } else compareAtKobo = value;
    }
    const stockQty = parseWhole(cell("stock"));
    if (stockQty === null) rowErrors.push("stock must be a whole number, 0 or more");
    let lowStockThreshold: number | undefined;
    if (cell("low_stock_threshold")) {
      const value = parseWhole(cell("low_stock_threshold"));
      if (value === null) rowErrors.push("low_stock_threshold must be a whole number");
      else lowStockThreshold = value;
    }

    const featured = parseBoolean(cell("featured"));
    if (featured === null) rowErrors.push("featured must be yes or no");
    const active = parseBoolean(cell("active"));
    if (active === null) rowErrors.push("active must be yes or no");

    let categoryIds: string[] | undefined;
    if (cell("categories")) {
      categoryIds = [];
      for (const path of splitList(cell("categories").toLowerCase())) {
        const id = categoryPaths.get(path.replace(/^\/|\/$/g, ""));
        if (id) categoryIds.push(id);
        else rowErrors.push(`unknown category "${path}"`);
      }
    }
    const tags = cell("tags")
      ? [...new Set(splitList(cell("tags").toLowerCase()))].map((tag) => tag.slice(0, 40))
      : undefined;

    if (rowErrors.length > 0) {
      for (const message of rowErrors) errors.push({ line, message });
      return;
    }
    seenSkus.set(sku.toUpperCase(), line);

    const variant: ImportVariant = {
      line,
      sku,
      label,
      priceKobo: priceKobo!,
      compareAtKobo,
      stockQty: stockQty!,
      lowStockThreshold,
    };

    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, {
        line,
        slug,
        name,
        brand: cell("brand") || undefined,
        description: cell("description") || undefined,
        categoryIds,
        tags,
        featured: featured ?? undefined,
        active: active ?? undefined,
        variants: [variant],
      });
      return;
    }
    // Later rows of the same product must not contradict the first one.
    const conflicts = (
      [
        ["product_name", existing.name, name],
        ["brand", existing.brand, cell("brand") || undefined],
        ["description", existing.description, cell("description") || undefined],
        ["featured", existing.featured, featured ?? undefined],
        ["active", existing.active, active ?? undefined],
      ] as const
    ).filter(([, first, current]) => current !== undefined && first !== undefined && first !== current);
    for (const [column] of conflicts) {
      errors.push({ line, message: `${column} differs from line ${existing.line} for ${slug}` });
    }
    if (conflicts.length === 0) existing.variants.push(variant);
  });

  return { products: [...bySlug.values()], errors };
}

/** True when the import can run: warnings about ignored columns are not blocking. */
export function hasBlockingErrors(parsed: ParsedImport): boolean {
  return parsed.errors.some((issue) => !issue.message.startsWith("Unknown columns"));
}

export type ExportRow = {
  slug: string;
  name: string;
  brand: string;
  description: string;
  categoryPaths: string[];
  tags: string[];
  featured: boolean;
  active: boolean;
  variants: {
    sku: string;
    label: string;
    priceKobo: number;
    compareAtKobo: number | null;
    stockQty: number;
    lowStockThreshold: number;
  }[];
};

/** Spreadsheet apps run cells that start with these as formulas; prefix them so they stay text. */
function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function productsToCsv(products: ExportRow[]): string {
  const rows = products.flatMap((product) =>
    product.variants.map((variant) => ({
      product_slug: product.slug,
      product_name: safeText(product.name),
      brand: safeText(product.brand),
      description: safeText(product.description),
      categories: product.categoryPaths.join("|"),
      tags: product.tags.join("|"),
      featured: product.featured ? "yes" : "no",
      active: product.active ? "yes" : "no",
      variant_sku: variant.sku,
      variant_label: safeText(variant.label),
      price_naira: koboToNairaInput(variant.priceKobo),
      compare_at_naira: variant.compareAtKobo === null ? "" : koboToNairaInput(variant.compareAtKobo),
      stock: String(variant.stockQty),
      low_stock_threshold: String(variant.lowStockThreshold),
    })),
  );
  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows.map((row) => CSV_COLUMNS.map((c) => row[c])) });
}
