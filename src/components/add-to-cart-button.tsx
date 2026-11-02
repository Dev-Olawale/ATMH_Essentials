"use client";

import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ productName }: { productName: string }) {
  const { addItem } = useCart();

  return (
    <Button
      size="sm"
      className="w-full"
      aria-label={`Add ${productName} to cart`}
      onClick={addItem}
    >
      Add to cart
    </Button>
  );
}
