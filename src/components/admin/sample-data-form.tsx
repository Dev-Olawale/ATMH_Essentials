"use client";

import { useActionState, useState } from "react";

import { removeSampleData, type SampleRemovalState } from "@/app/admin/actions/sample-data";
import { Field, inputClass, SubmitButton } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function SampleDataForm({ products, categories }: { products: number; categories: number }) {
  const [state, action] = useActionState<SampleRemovalState, FormData>(removeSampleData, { status: "idle" });
  const [open, setOpen] = useState(false);

  if (state.status === "done") {
    return (
      <p role="status" className="rounded-lg bg-blush-deep p-3 text-sm text-ink">
        {state.message}
      </p>
    );
  }
  if (!open) {
    return (
      <Button type="button" size="lg" className="self-start" disabled={products + categories === 0} onClick={() => setOpen(true)}>
        Remove all sample data…
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-rose-dark bg-blush p-4">
      <p className="text-sm text-ink">
        This permanently deletes {products} sample products with their options and photos. Your own products are not
        touched. This cannot be undone.
      </p>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" name="includeCategories" className="mt-0.5 size-5 accent-ink" />
        <span>
          Also delete sample categories ({categories}) that none of your own products use.
          <span className="block text-xs text-muted">
            Leave unticked if you are using the starter categories for your shop.
          </span>
        </span>
      </label>
      <Field label="Type REMOVE to confirm" htmlFor="confirm">
        <input id="confirm" name="confirm" autoComplete="off" autoCapitalize="characters" className={inputClass} />
      </Field>
      {state.status === "error" && (
        <p role="alert" className="border-l-2 border-rose-dark pl-2 text-ink text-sm">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Removing…">Delete sample data</SubmitButton>
        <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
