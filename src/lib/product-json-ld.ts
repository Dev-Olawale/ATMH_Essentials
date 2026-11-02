import { siteConfig } from "@/config/site";
import type { Product } from "@/data/products";

export function productJsonLd(product: Product) {
  const url = new URL(`/product/${product.slug}`, siteConfig.url).toString();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    sku: product.variants[0].sku,
    ...(product.images.length > 0 && {
      image: product.images.map((image) => new URL(image, siteConfig.url).toString()),
    }),
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      name: variant.label,
      sku: variant.sku,
      url,
      priceCurrency: "NGN",
      price: (variant.priceKobo / 100).toFixed(2),
      availability:
        variant.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    })),
  };
}

/** `<` is escaped so product text can never close the surrounding script tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
