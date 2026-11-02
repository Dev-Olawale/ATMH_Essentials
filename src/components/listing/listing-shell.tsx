"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  activeFilterCount,
  listingQuery,
  PAGE_SIZE,
  sortOptions,
  type ListingFilters,
  type SortKey,
} from "@/lib/listing";

function PriceForm({
  filters,
  onApply,
}: {
  filters: ListingFilters;
  onApply: (minKobo?: number, maxKobo?: number) => void;
}) {
  const id = useId();
  const toNaira = (kobo?: number) => (kobo === undefined ? "" : String(kobo / 100));
  const toKobo = (value: FormDataEntryValue | null) => {
    const naira = Number(value);
    return value === "" || !Number.isFinite(naira) || naira < 0 ? undefined : Math.round(naira * 100);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onApply(toKobo(data.get("min")), toKobo(data.get("max")));
      }}
      className="flex items-end gap-2"
    >
      {(["min", "max"] as const).map((name) => (
        <div key={name} className="min-w-0 flex-1">
          <label htmlFor={`${id}-${name}`} className="mb-1 block text-xs text-muted">
            {name === "min" ? "Min (₦)" : "Max (₦)"}
          </label>
          <input
            id={`${id}-${name}`}
            name={name}
            type="number"
            inputMode="numeric"
            min="0"
            defaultValue={toNaira(name === "min" ? filters.minKobo : filters.maxKobo)}
            className="h-10 w-full rounded-lg border border-blush-deep bg-white px-2 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:text-sm"
          />
        </div>
      ))}
      <Button type="submit" variant="outline" size="sm">
        Apply
      </Button>
    </form>
  );
}

function FilterPanel({
  brands,
  filters,
  update,
}: {
  brands: string[];
  filters: ListingFilters;
  update: (patch: Partial<ListingFilters>) => void;
}) {
  const hasActive = activeFilterCount(filters) > 0;
  const legendClass = "mb-2 text-xs font-medium tracking-[0.2em] text-ink uppercase";
  const rowClass = "flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink";

  return (
    <div className="flex flex-col gap-6">
      <label className={rowClass}>
        <input
          type="checkbox"
          checked={filters.inStock}
          onChange={(event) => update({ inStock: event.target.checked })}
          className="size-4 accent-ink"
        />
        In stock only
      </label>
      <fieldset>
        <legend className={legendClass}>Price</legend>
        <PriceForm
          key={`${filters.minKobo}-${filters.maxKobo}`}
          filters={filters}
          onApply={(minKobo, maxKobo) => update({ minKobo, maxKobo })}
        />
      </fieldset>
      {brands.length > 0 && (
        <fieldset>
          <legend className={legendClass}>Brand</legend>
          {brands.map((brand) => (
            <label key={brand} className={rowClass}>
              <input
                type="checkbox"
                checked={filters.brands.includes(brand)}
                onChange={(event) =>
                  update({
                    brands: event.target.checked
                      ? [...filters.brands, brand]
                      : filters.brands.filter((current) => current !== brand),
                  })
                }
                className="size-4 accent-ink"
              />
              {brand}
            </label>
          ))}
        </fieldset>
      )}
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            update({ brands: [], minKobo: undefined, maxKobo: undefined, inStock: false })
          }
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

/** Owns the URL: every filter change is a history entry, so back and share both work. */
export function ListingShell({
  basePath,
  q,
  filters,
  brands,
  total,
  children,
}: {
  basePath: string;
  q?: string;
  filters: ListingFilters;
  brands: string[];
  total: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const sortId = useId();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(filters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = activeFilterCount(optimistic);

  function update(patch: Partial<ListingFilters>) {
    const next = { ...optimistic, ...patch, show: PAGE_SIZE };
    startTransition(() => {
      setOptimistic(next);
      router.push(`${basePath}${listingQuery(next, q)}`, { scroll: false });
    });
  }

  const resultLabel = `${total} ${total === 1 ? "product" : "products"}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-10">
      <aside aria-label="Filters" className="hidden lg:block">
        <FilterPanel brands={brands} filters={optimistic} update={update} />
      </aside>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted">
            {resultLabel}
          </p>
          <div className="flex items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger render={<Button variant="outline" size="sm" className="lg:hidden" />}>
                <SlidersHorizontal />
                Filters{activeCount > 0 && ` (${activeCount})`}
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle className="font-serif text-2xl font-medium">Filters</SheetTitle>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                  <FilterPanel brands={brands} filters={optimistic} update={update} />
                </div>
                <div className="border-t border-blush-deep p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <Button className="w-full" onClick={() => setSheetOpen(false)}>
                    Show {resultLabel}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <label htmlFor={sortId} className="sr-only">
              Sort by
            </label>
            <select
              id={sortId}
              value={optimistic.sort}
              onChange={(event) => update({ sort: event.target.value as SortKey })}
              className="h-10 max-w-44 rounded-full border border-ink bg-transparent px-3 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div aria-busy={pending} className={pending ? "opacity-60 transition-opacity" : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
