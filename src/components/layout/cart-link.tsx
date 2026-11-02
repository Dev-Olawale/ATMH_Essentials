"use client";

import { ShoppingBag } from "lucide-react";

import { CartDrawerContents } from "@/components/cart/cart-contents";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { setCartDrawerOpen, useCart, useCartDrawer } from "@/lib/cart-store";

export function CartLink() {
  const { count } = useCart();
  const open = useCartDrawer();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
        className="relative"
        onClick={() => setCartDrawerOpen(true)}
      >
        <ShoppingBag className="size-5" />
        {count > 0 && (
          <span className="absolute top-1 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose px-1 text-[0.625rem] font-medium tracking-normal text-ink">
            {count}
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setCartDrawerOpen}>
        <SheetContent className="w-[90%] gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl font-medium">Your cart</SheetTitle>
          </SheetHeader>
          <CartDrawerContents onNavigate={() => setCartDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
