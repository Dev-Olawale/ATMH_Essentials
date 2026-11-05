"use client";

import { useState, useTransition } from "react";

import { getReorderLines } from "@/app/(store)/order/actions";
import { Button } from "@/components/ui/button";
import { addLines, setCartDrawerOpen } from "@/lib/cart-store";

/** Adds the order's items that are still available, at today's prices, then opens the cart. */
export function ReorderButton({ orderNumber, size = "lg" }: { orderNumber: string; size?: "lg" | "sm" }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="rose"
        size={size}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { lines, skipped } = await getReorderLines(orderNumber);
            if (lines.length > 0) {
              addLines(lines);
              setCartDrawerOpen(true);
            }
            setMessage(
              lines.length === 0
                ? "Sorry, none of these items are available right now."
                : skipped.length > 0
                  ? `Added to your cart. Not available right now: ${skipped.join(", ")}.`
                  : "",
            );
          })
        }
      >
        {pending ? "Adding…" : "Reorder"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
