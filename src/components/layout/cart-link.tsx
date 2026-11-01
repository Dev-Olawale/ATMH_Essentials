"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { buttonVariants } from "@/components/ui/button";

export function CartLink() {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}
    >
      <ShoppingBag className="size-5" />
      <span className="absolute top-1 right-0.5 flex size-4.5 items-center justify-center rounded-full bg-rose text-[0.625rem] font-medium tracking-normal text-ink">
        {count}
      </span>
    </Link>
  );
}
