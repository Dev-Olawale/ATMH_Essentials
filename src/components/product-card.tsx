import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { CategoryIcon } from "@/components/category-icon";
import { buttonVariants } from "@/components/ui/button";
import { getCategory } from "@/data/categories";
import type { Product } from "@/data/products";
import { toCartLine } from "@/lib/cart";
import { formatNaira } from "@/lib/format";
import { productInStock } from "@/lib/listing";

const tagLabels = { bestseller: "Bestseller", new: "New" } as const;

export function ProductCard({ product }: { product: Product }) {
  const cheapest = product.variants.reduce((lowest, variant) =>
    variant.priceKobo < lowest.priceKobo ? variant : lowest,
  );
  const hasRange = product.variants.some((variant) => variant.priceKobo !== cheapest.priceKobo);
  const icon = getCategory(product.categories[0].category)?.icon ?? "PackageOpen";
  const tag = product.tags[0];
  const href = `/product/${product.slug}`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white">
      <Link
        href={href}
        className="group flex flex-1 flex-col focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
      >
        <div className="relative aspect-square bg-blush-deep">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, 11rem"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-rose-dark">
              <CategoryIcon name={icon} className="size-12" strokeWidth={1} />
            </div>
          )}
          {tag && (
            <span className="absolute top-2 left-2 rounded-full bg-gold px-2.5 py-1 text-[0.625rem] font-medium tracking-widest text-ink uppercase">
              {tagLabels[tag]}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <p className="text-[0.6875rem] tracking-widest text-muted uppercase">{product.brand}</p>
          <h3 className="font-sans text-sm leading-snug font-normal text-ink group-hover:underline">
            {product.name}
          </h3>
          <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
            <span className="font-medium text-ink">
              {hasRange && <span className="text-xs font-normal text-muted">From </span>}
              {formatNaira(cheapest.priceKobo)}
            </span>
            {cheapest.compareAtKobo && (
              <s className="text-xs text-muted">{formatNaira(cheapest.compareAtKobo)}</s>
            )}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        {!productInStock(product) ? (
          <p className="flex h-10 items-center justify-center rounded-full bg-blush text-[0.6875rem] font-medium tracking-[0.12em] text-muted uppercase">
            Out of stock
          </p>
        ) : product.variants.length > 1 ? (
          <Link
            href={href}
            aria-label={`Select options for ${product.name}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
          >
            Select options
          </Link>
        ) : (
          <AddToCartButton line={toCartLine(product, product.variants[0], icon)} />
        )}
      </div>
    </article>
  );
}
