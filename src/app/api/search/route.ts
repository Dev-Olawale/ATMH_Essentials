import { NextResponse, type NextRequest } from "next/server";

import { searchCategories, searchProducts, type CategoryMatch } from "@/lib/catalog";
import { lowestPriceKobo } from "@/lib/listing";

export type SearchSuggestions = {
  products: { slug: string; name: string; priceKobo: number }[];
  categories: CategoryMatch[];
};

export function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100).trim();
  const body: SearchSuggestions = query
    ? {
        products: searchProducts(query)
          .slice(0, 5)
          .map((product) => ({
            slug: product.slug,
            name: product.name,
            priceKobo: lowestPriceKobo(product),
          })),
        categories: searchCategories(query).slice(0, 3),
      }
    : { products: [], categories: [] };
  return NextResponse.json(body);
}
