import type { Product } from "@/lib/catalog-types";

export const PAGE_SIZE = 12;

export const sortOptions = [
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
] as const;

export type SortKey = (typeof sortOptions)[number]["value"];

export type ListingFilters = {
  brands: string[];
  minKobo?: number;
  maxKobo?: number;
  inStock: boolean;
  sort: SortKey;
  show: number;
};

export type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function nairaToKobo(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const naira = Number(value);
  return Number.isFinite(naira) && naira >= 0 ? Math.round(naira * 100) : undefined;
}

export function parseListingParams(params: RawParams): ListingFilters {
  const brand = params.brand;
  const brands = brand === undefined ? [] : Array.isArray(brand) ? brand : [brand];

  let minKobo = nairaToKobo(first(params.min));
  let maxKobo = nairaToKobo(first(params.max));
  if (minKobo !== undefined && maxKobo !== undefined && minKobo > maxKobo) {
    [minKobo, maxKobo] = [maxKobo, minKobo];
  }

  const sortParam = first(params.sort);
  const sort = sortOptions.find((option) => option.value === sortParam)?.value ?? "popular";

  const showParam = Math.floor(Number(first(params.show)));
  const show = showParam >= PAGE_SIZE ? showParam : PAGE_SIZE;

  return {
    brands: [...new Set(brands.filter(Boolean))],
    minKobo,
    maxKobo,
    inStock: first(params.stock) === "1",
    sort,
    show,
  };
}

/** The query string for a listing state, leaving out defaults so URLs stay short. */
export function listingQuery(filters: ListingFilters, q?: string): string {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  filters.brands.forEach((brand) => query.append("brand", brand));
  if (filters.minKobo !== undefined) query.set("min", String(filters.minKobo / 100));
  if (filters.maxKobo !== undefined) query.set("max", String(filters.maxKobo / 100));
  if (filters.inStock) query.set("stock", "1");
  if (filters.sort !== "popular") query.set("sort", filters.sort);
  if (filters.show !== PAGE_SIZE) query.set("show", String(filters.show));
  const value = query.toString();
  return value ? `?${value}` : "";
}

export function activeFilterCount(filters: ListingFilters): number {
  return (
    filters.brands.length +
    (filters.minKobo !== undefined || filters.maxKobo !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0)
  );
}

export function lowestPriceKobo(product: Product): number {
  return Math.min(...product.variants.map((variant) => variant.priceKobo));
}

export function productInStock(product: Product): boolean {
  return product.variants.some((variant) => variant.stockQty > 0);
}

const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
  popular: (a, b) => b.popularity - a.popularity,
  "price-asc": (a, b) => lowestPriceKobo(a) - lowestPriceKobo(b),
  "price-desc": (a, b) => lowestPriceKobo(b) - lowestPriceKobo(a),
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

/** Filters and sorts, without paging. A product matches if one variant satisfies every filter. */
export function applyListing(products: Product[], filters: ListingFilters): Product[] {
  return products
    .filter((product) => {
      if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) return false;
      return product.variants.some(
        (variant) =>
          (!filters.inStock || variant.stockQty > 0) &&
          (filters.minKobo === undefined || variant.priceKobo >= filters.minKobo) &&
          (filters.maxKobo === undefined || variant.priceKobo <= filters.maxKobo),
      );
    })
    .sort(sorters[filters.sort]);
}
