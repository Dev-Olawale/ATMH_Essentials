import { describe, expect, it } from "vitest";

import { productJsonLd, serializeJsonLd } from "@/lib/product-json-ld";
import { sampleCatalog } from "@/test/sample-catalog";

const { products } = sampleCatalog();

describe("productJsonLd", () => {
  it("describes every variant in naira with availability", () => {
    const product = products.find((item) => item.slug === "nivea-body-lotion")!;
    const data = productJsonLd(product);
    expect(data.offers).toHaveLength(2);
    expect(data.offers[0]).toMatchObject({
      priceCurrency: "NGN",
      price: "4200.00",
      availability: "https://schema.org/InStock",
    });
    expect(data.offers[1].availability).toBe("https://schema.org/OutOfStock");
    expect(data).not.toHaveProperty("image");
  });

  it("lists photos as absolute URLs", () => {
    const product = { ...products[0], images: [{ url: "https://cdn.example/a.webp", alt: "A" }] };
    expect(productJsonLd(product).image).toEqual(["https://cdn.example/a.webp"]);
  });
});

describe("serializeJsonLd", () => {
  it("cannot break out of the script tag", () => {
    const output = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(output).not.toContain("<");
    expect(JSON.parse(output).name).toContain("</script>");
  });
});
