"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { saveProduct, type FormState } from "@/app/admin/actions/products";
import { Field, FormErrors, inputClass, SubmitButton, Toggle, useFormAction } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { emptyVariant, type VariantValues } from "@/lib/admin/variant-values";
import { slugify } from "@/lib/catalog-types";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  featured: boolean;
  active: boolean;
  isSample: boolean;
  categoryIds: string[];
  tags: string[];
  variants: VariantValues[];
};


export type CategoryOption = { id: string; name: string; depth: number; active: boolean };

const BADGE_TAGS = [
  { name: "bestseller", label: "Bestseller", hint: "Shows a badge and the Best Sellers row on the homepage" },
  { name: "new", label: "New", hint: "Shows a badge and the New In row on the homepage" },
];

let keySeed = 0;
const newKey = () => `added-${++keySeed}`;

export function ProductForm({
  initial,
  categories,
}: {
  initial: ProductFormValues;
  categories: CategoryOption[];
}) {
  const { state, pending, onSubmit } = useFormAction<FormState>(saveProduct, { status: "idle" });
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  // New products get a web address from the name until the owner edits it.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [variants, setVariants] = useState<VariantValues[]>(initial.variants);

  const update = (key: string, field: keyof VariantValues, value: string) =>
    setVariants((current) => current.map((v) => (v.key === key ? { ...v, [field]: value } : v)));

  const extraTags = initial.tags.filter((tag) => !BADGE_TAGS.some((badge) => badge.name === tag));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          variants.map((variant) => ({
            id: variant.id,
            label: variant.label,
            sku: variant.sku,
            price: variant.price,
            compareAt: variant.compareAt,
            stock: variant.stock,
            lowStockThreshold: variant.lowStockThreshold,
          })),
        )}
      />

      <FormErrors errors={state.status === "error" ? state.errors : undefined} />

      <section className="flex flex-col gap-4 rounded-xl bg-white p-4">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Details</h2>
        <Field label="Product name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Web address" htmlFor="slug" hint={`The page will be /product/${slug || "…"}`}>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value.toLowerCase());
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Brand" htmlFor="brand">
          <input id="brand" name="brand" defaultValue={initial.brand} className={inputClass} />
        </Field>
        <Field label="Description" htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={initial.description}
            className={`${inputClass} h-auto py-2`}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-white p-4">
        <div>
          <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Options, prices and stock</h2>
          <p className="text-xs text-muted">
            One row per size, scent or pack. Prices in naira, e.g. 2500. &quot;Was&quot; price is optional
            and shows as a strike-through.
          </p>
        </div>
        {variants.map((variant, index) => (
          <fieldset key={variant.key} className="grid grid-cols-2 gap-3 rounded-lg border border-blush-deep p-3 sm:grid-cols-6">
            <legend className="px-1 text-xs text-muted">Option {index + 1}</legend>
            <Field label="Size / scent / pack" htmlFor={`${variant.key}-label`}>
              <input
                id={`${variant.key}-label`}
                value={variant.label}
                placeholder="500ml"
                onChange={(event) => update(variant.key, "label", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="SKU" htmlFor={`${variant.key}-sku`}>
              <input
                id={`${variant.key}-sku`}
                value={variant.sku}
                placeholder="ARL-500"
                autoCapitalize="characters"
                onChange={(event) => update(variant.key, "sku", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Price (₦)" htmlFor={`${variant.key}-price`}>
              <input
                id={`${variant.key}-price`}
                inputMode="decimal"
                value={variant.price}
                onChange={(event) => update(variant.key, "price", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Was (₦)" htmlFor={`${variant.key}-compare`}>
              <input
                id={`${variant.key}-compare`}
                inputMode="decimal"
                value={variant.compareAt}
                onChange={(event) => update(variant.key, "compareAt", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="In stock" htmlFor={`${variant.key}-stock`}>
              <input
                id={`${variant.key}-stock`}
                inputMode="numeric"
                value={variant.stock}
                onChange={(event) => update(variant.key, "stock", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Alert below" htmlFor={`${variant.key}-low`}>
              <input
                id={`${variant.key}-low`}
                inputMode="numeric"
                value={variant.lowStockThreshold}
                onChange={(event) => update(variant.key, "lowStockThreshold", event.target.value)}
                className={inputClass}
              />
            </Field>
            {variants.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                className="col-span-2 justify-self-start sm:col-span-6"
                onClick={() => setVariants((current) => current.filter((v) => v.key !== variant.key))}
              >
                <Trash2 /> Remove option {index + 1}
              </Button>
            )}
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => setVariants((current) => [...current, emptyVariant(newKey())])}
        >
          <Plus /> Add another option
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-white p-4">
        <div>
          <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Categories</h2>
          <p className="text-xs text-muted">Tick every category it belongs in. The first ticked one is its main category.</p>
        </div>
        <div className="max-h-80 overflow-y-auto rounded-lg border border-blush-deep p-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex min-h-10 items-center gap-3 rounded px-2 text-sm text-ink hover:bg-blush"
              style={{ paddingLeft: `${0.5 + category.depth * 1.25}rem` }}
            >
              <input
                type="checkbox"
                name="categoryIds"
                value={category.id}
                defaultChecked={initial.categoryIds.includes(category.id)}
                className="size-5 accent-ink"
              />
              <span className={category.depth === 0 ? "font-medium" : ""}>{category.name}</span>
              {!category.active && <span className="text-xs text-muted">(hidden)</span>}
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-white p-4">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Homepage and visibility</h2>
        <Toggle
          name="featured"
          label="Feature on the homepage"
          hint="Pinned to the front of the Best Sellers row"
          defaultChecked={initial.featured}
        />
        {BADGE_TAGS.map((tag) => (
          <label key={tag.name} className="flex min-h-11 items-start gap-3 rounded-lg border border-blush-deep p-3">
            <input
              type="checkbox"
              name="tags"
              value={tag.name}
              defaultChecked={initial.tags.includes(tag.name)}
              className="mt-0.5 size-5 accent-ink"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-ink">{tag.label}</span>
              <span className="text-xs text-muted">{tag.hint}</span>
            </span>
          </label>
        ))}
        <Field label="Other tags" htmlFor="extraTags" hint="Optional, separated by commas, e.g. gift, travel size">
          <input id="extraTags" name="extraTags" defaultValue={extraTags.join(", ")} className={inputClass} />
        </Field>
        <Toggle
          name="active"
          label="Show in the store"
          hint="Untick to archive: hidden from shoppers but kept here"
          defaultChecked={initial.active}
        />
        <Toggle
          name="isSample"
          label="Sample product"
          hint="Sample products are deleted by “Remove all sample data”. Untick to keep this one."
          defaultChecked={initial.isSample}
        />
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-blush-deep bg-blush/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <SubmitButton pending={pending}>{initial.id ? "Save changes" : "Create product"}</SubmitButton>
      </div>
    </form>
  );
}
