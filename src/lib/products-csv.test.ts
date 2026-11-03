import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CSV_COLUMNS,
  hasBlockingErrors,
  parseProductsCsv,
  productsToCsv,
  type ExportRow,
} from "@/lib/products-csv";

const categories = new Map([
  ["laundry", "cat-laundry"],
  ["laundry/fabric-softeners", "cat-softeners"],
  ["fragrances", "cat-fragrances"],
]);

const header = CSV_COLUMNS.join(",");
const csv = (...rows: string[]) => [header, ...rows].join("\n");
const row = (overrides: Partial<Record<(typeof CSV_COLUMNS)[number], string>> = {}) => {
  const values: Record<string, string> = {
    product_slug: "downy",
    product_name: "Downy Softener",
    brand: "Downy",
    description: "Soft clothes",
    categories: "laundry/fabric-softeners|laundry",
    tags: "new|Bestseller",
    featured: "yes",
    active: "",
    variant_sku: "DWN-500",
    variant_label: "500ml",
    price_naira: "2,800",
    compare_at_naira: "",
    stock: "24",
    low_stock_threshold: "",
    ...overrides,
  };
  return CSV_COLUMNS.map((column) => {
    const value = values[column];
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(",");
};

describe("parseProductsCsv", () => {
  it("groups variant rows into one product and converts naira to kobo", () => {
    const parsed = parseProductsCsv(
      csv(row(), row({ variant_sku: "DWN-1L", variant_label: "1L", price_naira: "5200.50", compare_at_naira: "6000" })),
      categories,
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.products).toHaveLength(1);
    const [product] = parsed.products;
    expect(product).toMatchObject({
      slug: "downy",
      categoryIds: ["cat-softeners", "cat-laundry"],
      tags: ["new", "bestseller"],
      featured: true,
      active: undefined,
    });
    expect(product.variants.map((v) => [v.sku, v.priceKobo, v.compareAtKobo, v.stockQty])).toEqual([
      ["DWN-500", 280_000, undefined, 24],
      ["DWN-1L", 520_050, 600_000, 24],
    ]);
  });

  it("reports each bad cell with its line number", () => {
    const parsed = parseProductsCsv(
      csv(
        row({ price_naira: "abc", stock: "-1" }),
        row({ variant_sku: "X-2", categories: "nope", featured: "maybe" }),
        row({ variant_sku: "X-3", price_naira: "100", compare_at_naira: "90" }),
      ),
      categories,
    );
    expect(hasBlockingErrors(parsed)).toBe(true);
    expect(parsed.errors).toEqual([
      { line: 2, message: "price_naira must be a positive amount" },
      { line: 2, message: "stock must be a whole number, 0 or more" },
      { line: 3, message: "featured must be yes or no" },
      { line: 3, message: 'unknown category "nope"' },
      { line: 4, message: "compare_at_naira must be higher than price_naira" },
    ]);
  });

  it("rejects repeated SKUs (case-insensitive) and contradictory product rows", () => {
    const parsed = parseProductsCsv(
      csv(row(), row({ variant_sku: "dwn-500" }), row({ variant_sku: "DWN-2", brand: "Other" })),
      categories,
    );
    expect(parsed.errors.map((issue) => issue.line)).toEqual([3, 4]);
    expect(parsed.errors[0].message).toContain("repeated");
    expect(parsed.errors[1].message).toBe("brand differs from line 2 for downy");
  });

  it("requires the key columns and at least one row", () => {
    expect(parseProductsCsv("product_slug,product_name\nx,y", categories).errors[0].message).toMatch(
      /^Missing columns: variant_sku, variant_label, price_naira, stock$/,
    );
    expect(parseProductsCsv(header, categories).errors).toEqual([
      { line: 1, message: "The file has no product rows." },
    ]);
  });

  it("treats blank optional cells as 'keep current' and derives a missing slug", () => {
    const parsed = parseProductsCsv(
      csv(row({ product_slug: "", product_name: "Big & Bold Bleach", categories: "", tags: "", featured: "" })),
      categories,
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.products[0]).toMatchObject({
      slug: "big-and-bold-bleach",
      categoryIds: undefined,
      tags: undefined,
      featured: undefined,
    });
  });

  it("only warns about unknown columns, and handles a byte-order mark and quoted commas", () => {
    const text = `﻿${header},colour\n${row({ description: 'Soft, "fresh" clothes' })},red`;
    const parsed = parseProductsCsv(text, categories);
    expect(hasBlockingErrors(parsed)).toBe(false);
    expect(parsed.errors[0].message).toBe("Unknown columns (ignored): colour");
    expect(parsed.products[0].description).toBe('Soft, "fresh" clothes');
  });

  it("accepts the sample template", () => {
    const template = readFileSync("public/templates/products-template.csv", "utf8");
    const paths = new Map([
      ["cleaning-and-household", "a"],
      ["cleaning-and-household/detergents", "b"],
      ["laundry", "c"],
      ["laundry/laundry-detergent", "d"],
      ["fragrances", "e"],
      ["fragrances/perfume-oils", "f"],
    ]);
    const parsed = parseProductsCsv(template, paths);
    expect(parsed.errors).toEqual([]);
    expect(parsed.products.length).toBeGreaterThan(0);
  });
});

describe("productsToCsv", () => {
  const product: ExportRow = {
    slug: "downy",
    name: "=HYPERLINK(evil)",
    brand: "Downy",
    description: "Soft, fresh",
    categoryPaths: ["laundry/fabric-softeners"],
    tags: ["new"],
    featured: false,
    active: true,
    variants: [
      { sku: "DWN-500", label: "500ml", priceKobo: 280_050, compareAtKobo: null, stockQty: 3, lowStockThreshold: 5 },
    ],
  };

  it("round-trips through the importer", () => {
    const parsed = parseProductsCsv(productsToCsv([{ ...product, name: "Downy" }]), categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.products[0]).toMatchObject({ slug: "downy", description: "Soft, fresh", active: true });
    expect(parsed.products[0].variants[0]).toMatchObject({ priceKobo: 280_050, stockQty: 3, lowStockThreshold: 5 });
  });

  it("stops spreadsheet formulas from running", () => {
    expect(productsToCsv([product])).toContain("'=HYPERLINK(evil)");
  });
});
