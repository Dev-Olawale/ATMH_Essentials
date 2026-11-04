import { describe, expect, it } from "vitest";

import type { Product } from "@/lib/catalog-types";
import {
  activeFilterCount,
  applyListing,
  listingQuery,
  PAGE_SIZE,
  parseListingParams,
} from "@/lib/listing";

function product(slug: string, overrides: Partial<Product>, prices: [number, number][]): Product {
  return {
    slug,
    name: slug,
    brand: "A",
    categories: [],
    icon: "PackageOpen",
    description: "",
    images: [],
    variants: prices.map(([priceKobo, stockQty], index) => ({
      sku: `${slug}-${index}`,
      label: String(index),
      priceKobo,
      stockQty,
      lowStockThreshold: 1,
    })),
    tags: [],
    featured: false,
    popularity: 0,
    createdAt: "2026-01-01",
    ...overrides,
  };
}

const items = [
  product("cheap", { popularity: 1, createdAt: "2026-03-01" }, [[10_000, 5]]),
  product("mid", { popularity: 3, createdAt: "2026-01-01", brand: "B" }, [[50_000, 5]]),
  product("dear", { popularity: 2, createdAt: "2026-02-01" }, [[90_000, 0], [20_000, 5]]),
  product("gone", { popularity: 0, createdAt: "2025-01-01", brand: "B" }, [[30_000, 0]]),
];
const slugs = (list: Product[]) => list.map((item) => item.slug);
const run = (params: Record<string, string | string[]>) =>
  slugs(applyListing(items, parseListingParams(params)));

describe("parseListingParams", () => {
  it("falls back to defaults for missing or invalid values", () => {
    expect(parseListingParams({ sort: "x", min: "abc", max: "-4", show: "-1", stock: "yes" })).toEqual({
      brands: [],
      minKobo: undefined,
      maxKobo: undefined,
      inStock: false,
      sort: "popular",
      show: PAGE_SIZE,
    });
  });

  it("converts naira to kobo and swaps a reversed range", () => {
    const filters = parseListingParams({ min: "500", max: "100" });
    expect(filters.minKobo).toBe(10_000);
    expect(filters.maxKobo).toBe(50_000);
  });

  it("accepts one or many brands", () => {
    expect(parseListingParams({ brand: "A" }).brands).toEqual(["A"]);
    expect(parseListingParams({ brand: ["A", "B", "A"] }).brands).toEqual(["A", "B"]);
  });
});

describe("listingQuery", () => {
  it("is empty for the default state", () => {
    expect(listingQuery(parseListingParams({}))).toBe("");
  });

  it("round-trips through parse", () => {
    const filters = parseListingParams({
      brand: ["Dark & Lovely", "B"],
      min: "100",
      max: "2500.5",
      stock: "1",
      sort: "newest",
      show: "24",
    });
    const query = listingQuery(filters, "soap");
    const search = new URLSearchParams(query);
    expect(search.get("q")).toBe("soap");
    expect(
      parseListingParams({
        brand: search.getAll("brand"),
        min: search.get("min") ?? undefined,
        max: search.get("max") ?? undefined,
        stock: search.get("stock") ?? undefined,
        sort: search.get("sort") ?? undefined,
        show: search.get("show") ?? undefined,
      }),
    ).toEqual(filters);
  });
});

describe("activeFilterCount", () => {
  it("counts each brand, the price range once, and stock", () => {
    expect(activeFilterCount(parseListingParams({ brand: ["A", "B"], min: "1", max: "2", stock: "1" }))).toBe(4);
  });
});

describe("applyListing", () => {
  it("sorts by each option", () => {
    expect(run({})).toEqual(["mid", "dear", "cheap", "gone"]);
    expect(run({ sort: "price-asc" })).toEqual(["cheap", "dear", "gone", "mid"]);
    expect(run({ sort: "price-desc" })).toEqual(["mid", "gone", "dear", "cheap"]);
    expect(run({ sort: "newest" })).toEqual(["cheap", "dear", "mid", "gone"]);
  });

  it("filters by brand and stock", () => {
    expect(run({ brand: "B" })).toEqual(["mid", "gone"]);
    expect(run({ stock: "1" })).toEqual(["mid", "dear", "cheap"]);
  });

  it("matches a price range against any variant", () => {
    expect(run({ min: "800" })).toEqual(["dear"]);
    expect(run({ max: "150" })).toEqual(["cheap"]);
  });

  it("needs one variant to satisfy price and stock together", () => {
    expect(run({ min: "800", stock: "1" })).toEqual([]);
  });

  it("does not mutate the input", () => {
    const before = slugs(items);
    run({ sort: "price-asc" });
    expect(slugs(items)).toEqual(before);
  });
});
