import { NextResponse, type NextRequest } from "next/server";

import { searchCategories, searchProducts, type CategoryMatch } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-db";
import { lowestPriceKobo } from "@/lib/listing";

export type SearchSuggestions = {
  products: { slug: string; name: string; priceKobo: number }[];
  categories: CategoryMatch[];
};

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100).trim();
  const catalog = query ? await getCatalog() : undefined;
  const body: SearchSuggestions = catalog
    ? {
        products: searchProducts(catalog, query)
          .slice(0, 5)
          .map((product) => ({
            slug: product.slug,
            name: product.name,
            priceKobo: lowestPriceKobo(product),
          })),
        categories: searchCategories(catalog.categories, query).slice(0, 3),
      }
    : { products: [], categories: [] };
  return NextResponse.json(body);
}
