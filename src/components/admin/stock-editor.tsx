"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateVariantStock } from "@/app/admin/actions/products";
import { inputClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function StockEditor({ variantId, stock, label }: { variantId: string; stock: number; label: string }) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = Number(value);
        if (!/^\d{1,9}$/.test(value.trim())) return setError(true);
        startTransition(async () => {
          const result = await updateVariantStock(variantId, next);
          setError(!result.ok);
          router.refresh();
        });
      }}
    >
      <input
        aria-label={`New stock for ${label}`}
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={`${inputClass} h-10 w-20`}
        aria-invalid={error}
      />
      <Button type="submit" size="sm" disabled={pending || value === String(stock)}>
        {pending ? "Saving…" : "Update"}
      </Button>
    </form>
  );
}
