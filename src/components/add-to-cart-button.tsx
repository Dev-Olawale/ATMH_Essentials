"use client";

import { Button } from "@/components/ui/button";
import type { CartLine } from "@/lib/cart";
import { setCartDrawerOpen, useCart } from "@/lib/cart-store";

export function AddToCartButton({ line }: { line: CartLine }) {
  const { add } = useCart();

  return (
    <Button
      size="sm"
      className="w-full"
      aria-label={`Add ${line.name} to cart`}
      onClick={() => {
        add(line);
        setCartDrawerOpen(true);
      }}
    >
      Add to cart
    </Button>
  );
}
