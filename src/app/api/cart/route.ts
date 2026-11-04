import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { FreshVariant } from "@/lib/cart";
import { getCatalog } from "@/lib/catalog-db";

export type CartRefresh = { items: FreshVariant[] };

const body = z.object({ skus: z.array(z.string().max(100)).max(100) });

/** Current price, name and stock for the SKUs in a shopper's saved cart. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const wanted = new Set(parsed.data.skus);
  const { products } = await getCatalog();
  const items: FreshVariant[] = products.flatMap((product) =>
    product.variants
      .filter((variant) => wanted.has(variant.sku))
      .map((variant) => ({
        sku: variant.sku,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.label,
        priceKobo: variant.priceKobo,
        icon: product.icon,
        stockQty: variant.stockQty,
      })),
  );
  return NextResponse.json({ items } satisfies CartRefresh);
}
