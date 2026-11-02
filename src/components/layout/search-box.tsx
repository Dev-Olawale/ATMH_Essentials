"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { formatNaira } from "@/lib/format";
import type { SearchSuggestions } from "@/app/api/search/route";

const EMPTY: SearchSuggestions = { products: [], categories: [] };

export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [settledQuery, setSettledQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        setResults((await response.json()) as SearchSuggestions);
        setSettledQuery(trimmed);
      } catch {
        // Aborted or offline: the form still submits to the results page.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const options = [
    ...results.products.map((product) => ({
      key: `product-${product.slug}`,
      href: `/product/${product.slug}`,
      name: product.name,
      detail: formatNaira(product.priceKobo),
    })),
    ...results.categories.map((category) => ({
      key: `category-${category.href}`,
      href: category.href,
      name: category.name,
      detail: category.parent ?? "Category",
    })),
  ];
  const productCount = results.products.length;
  const isFresh = settledQuery === trimmed && trimmed !== "";
  const open = focused && !dismissed && isFresh;
  const showList = open && options.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  function reset() {
    setQuery("");
    setActiveIndex(-1);
    setDismissed(true);
    setSettledQuery("");
    setResults(EMPTY);
  }

  function go(href: string) {
    reset();
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDismissed(true);
      setActiveIndex(-1);
    } else if (showList && event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (showList && event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? options.length : index) - 1);
    }
  }

  function renderOption(option: (typeof options)[number], index: number) {
    return (
      <div
        key={option.key}
        id={optionId(index)}
        role="option"
        aria-selected={index === activeIndex}
        // Keeps focus in the input so the list is not closed before the click lands.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => go(option.href)}
        className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-blush ${
          index === activeIndex ? "bg-blush-deep" : ""
        }`}
      >
        <span className="min-w-0">{option.name}</span>
        <span className="shrink-0 text-xs text-muted">{option.detail}</span>
      </div>
    );
  }

  return (
    <form
      action="/search"
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const active = showList ? options[activeIndex] : undefined;
        go(active ? active.href : `/search?q=${encodeURIComponent(trimmed)}`);
      }}
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          name="q"
          role="combobox"
          aria-label="Search products and categories"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          placeholder="Search products"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setDismissed(false);
            setActiveIndex(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-full border border-blush-deep bg-blush pr-4 pl-10 text-base text-ink placeholder:text-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:text-sm"
        />
        <div
          className={
            open
              ? "absolute inset-x-0 top-full z-50 mt-2 max-h-[60dvh] overflow-y-auto rounded-2xl bg-white p-2 shadow-lg"
              : "hidden"
          }
        >
          <div id={listId} role="listbox" aria-label="Search suggestions">
            {productCount > 0 && (
              <div role="group" aria-label="Products">
                <p
                  role="presentation"
                  className="px-3 py-1.5 text-[0.6875rem] tracking-widest text-muted uppercase"
                >
                  Products
                </p>
                {options.slice(0, productCount).map((option, index) => renderOption(option, index))}
              </div>
            )}
            {results.categories.length > 0 && (
              <div role="group" aria-label="Categories">
                <p
                  role="presentation"
                  className="px-3 py-1.5 text-[0.6875rem] tracking-widest text-muted uppercase"
                >
                  Categories
                </p>
                {options
                  .slice(productCount)
                  .map((option, index) => renderOption(option, index + productCount))}
              </div>
            )}
          </div>
          {open && options.length === 0 && (
            <p role="status" className="px-3 py-2.5 text-sm text-muted">
              No matches for &ldquo;{trimmed}&rdquo;
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
