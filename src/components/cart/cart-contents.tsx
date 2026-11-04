"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";

import { CategoryIcon, type CategoryIconName } from "@/components/category-icon";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { lineTotalKobo, MAX_LINE_QTY, type CartLine } from "@/lib/cart";
import { dismissCartNotice, useCart, useCartNotice, useHydrated } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";

function CartLineItem({ line, onNavigate }: { line: CartLine; onNavigate?: () => void }) {
  const { setQty, remove } = useCart();
  const limit = Math.min(line.maxQty, MAX_LINE_QTY);

  return (
    <li className="flex gap-3 border-b border-blush-deep py-4">
      <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-blush-deep text-rose-dark">
        <CategoryIcon name={line.icon as CategoryIconName} className="size-8" strokeWidth={1} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/product/${line.slug}`}
              onClick={onNavigate}
              className="text-sm leading-snug text-ink hover:underline"
            >
              {line.name}
            </Link>
            <p className="text-xs text-muted">{line.variantLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${line.name}`}
            className="-mt-2 -mr-2"
            onClick={() => remove(line.sku)}
          >
            <Trash2 />
          </Button>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            label={line.name}
            value={line.qty}
            max={limit}
            onChange={(qty) => setQty(line.sku, qty)}
          />
          <p className="text-sm font-medium text-ink">{formatNaira(lineTotalKobo(line))}</p>
        </div>
        {line.qty >= limit && (
          <p className="text-xs text-muted">Maximum available quantity reached.</p>
        )}
      </div>
    </li>
  );
}

function CartSummary({ onNavigate, showCartLink }: { onNavigate?: () => void; showCartLink?: boolean }) {
  const { subtotalKobo } = useCart();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-ink">Subtotal</span>
        <span className="text-lg font-medium text-ink">{formatNaira(subtotalKobo)}</span>
      </div>
      <p className="text-xs text-muted">Delivery is calculated at checkout.</p>
      <Link
        href="/checkout"
        onClick={onNavigate}
        className={buttonVariants({ size: "lg", className: "w-full" })}
      >
        Checkout
      </Link>
      {showCartLink && (
        <Link
          href="/cart"
          onClick={onNavigate}
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          View cart
        </Link>
      )}
    </div>
  );
}

function CartNotice() {
  const notice = useCartNotice();
  if (!notice) return null;
  return (
    <div
      role="status"
      className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-blush-deep p-3 text-sm text-ink"
    >
      <p>{notice}</p>
      <button type="button" onClick={dismissCartNotice} className="shrink-0 text-xs underline">
        Dismiss
      </button>
    </div>
  );
}

function CartEmpty({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <ShoppingBag aria-hidden="true" className="size-10 text-rose-dark" strokeWidth={1} />
      <p className="font-serif text-2xl text-ink">Your cart is empty</p>
      <Link
        href="/category"
        onClick={onNavigate}
        className={buttonVariants({ variant: "rose" })}
      >
        Browse categories
      </Link>
    </div>
  );
}

export function CartDrawerContents({ onNavigate }: { onNavigate: () => void }) {
  const { lines } = useCart();

  if (lines.length === 0) {
    return (
      <div className="px-4">
        <CartNotice />
        <CartEmpty onNavigate={onNavigate} />
      </div>
    );
  }
  return (
    <>
      <div className="px-4 pt-2">
        <CartNotice />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-4">
        {lines.map((line) => (
          <CartLineItem key={line.sku} line={line} onNavigate={onNavigate} />
        ))}
      </ul>
      <div className="border-t border-blush-deep p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <CartSummary onNavigate={onNavigate} showCartLink />
      </div>
    </>
  );
}

export function CartPageContents() {
  const { lines } = useCart();
  const hydrated = useHydrated();

  // The cart lives in localStorage, so the server cannot know what to render.
  if (!hydrated) {
    return <div aria-hidden="true" className="h-64 animate-pulse rounded-2xl bg-blush-deep" />;
  }
  if (lines.length === 0) {
    return (
      <>
        <CartNotice />
        <CartEmpty />
      </>
    );
  }

  return (
    <>
      <CartNotice />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
        <ul className="rounded-2xl bg-white px-4">
          {lines.map((line) => (
            <CartLineItem key={line.sku} line={line} />
          ))}
        </ul>
        <div className="rounded-2xl bg-white p-4">
          <CartSummary />
        </div>
      </div>
    </>
  );
}
