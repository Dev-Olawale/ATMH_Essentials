"use client";

import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";

import type { CategoryIconName } from "@/components/category-icon";
import { QuantityStepper } from "@/components/quantity-stepper";
import { WhatsAppIcon } from "@/components/social-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Product } from "@/lib/catalog-types";
import { MAX_LINE_QTY, toCartLine } from "@/lib/cart";
import { setCartDrawerOpen, useCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import { whatsappOrderHref } from "@/lib/whatsapp";

export function ProductPurchase({
  product,
  icon,
  whatsappNumber,
}: {
  product: Product;
  icon: CategoryIconName;
  /** The store's number from settings. */
  whatsappNumber: string;
}) {
  const { add } = useCart();
  const [sku, setSku] = useState(
    (product.variants.find((variant) => variant.stockQty > 0) ?? product.variants[0]).sku,
  );
  const [requestedQty, setRequestedQty] = useState(1);

  const variant = product.variants.find((candidate) => candidate.sku === sku)!;
  const limit = Math.min(variant.stockQty, MAX_LINE_QTY);
  const qty = Math.max(1, Math.min(requestedQty, limit));
  const available = variant.stockQty > 0;
  const low = available && variant.stockQty <= variant.lowStockThreshold;

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-2xl font-medium text-ink">{formatNaira(variant.priceKobo)}</span>
        {variant.compareAtKobo && (
          <s className="text-sm text-muted">
            <span className="sr-only">Was </span>
            {formatNaira(variant.compareAtKobo)}
          </s>
        )}
      </p>

      <p role="status" className="flex items-center gap-2 text-sm text-ink">
        {!available ? (
          <>
            <CircleX aria-hidden="true" className="size-4 text-rose-dark" />
            Out of stock
          </>
        ) : low ? (
          <>
            <CircleAlert aria-hidden="true" className="size-4 text-gold-dark" />
            Only {variant.stockQty} left
          </>
        ) : (
          <>
            <CircleCheck aria-hidden="true" className="size-4 text-gold-dark" />
            In stock
          </>
        )}
      </p>

      {product.variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-xs font-medium tracking-[0.2em] text-ink uppercase">
            Options
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((option) => {
              const soldOut = option.stockQty === 0;
              return (
                <label
                  key={option.sku}
                  className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${
                    option.sku === sku
                      ? "border-ink bg-ink text-white"
                      : "border-blush-deep bg-white text-ink hover:border-ink"
                  } ${soldOut ? "line-through" : ""}`}
                >
                  <input
                    type="radio"
                    name={`variant-${product.slug}`}
                    value={option.sku}
                    checked={option.sku === sku}
                    onChange={() => setSku(option.sku)}
                    className="sr-only"
                  />
                  {option.label}
                  {soldOut && <span className="sr-only"> (out of stock)</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {available && (
        <QuantityStepper
          label={product.name}
          value={qty}
          max={limit}
          onChange={setRequestedQty}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          disabled={!available}
          onClick={() => {
            add(toCartLine(product, variant, icon), qty);
            setCartDrawerOpen(true);
          }}
        >
          {available ? "Add to cart" : "Out of stock"}
        </Button>
        <a
          href={whatsappOrderHref(whatsappNumber, product.name, variant.label, qty)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg", className: "flex-1 gap-2" })}
        >
          <WhatsAppIcon className="size-4" />
          Order on WhatsApp
        </a>
      </div>
    </div>
  );
}
