"use client";

import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  moveCategory,
  saveCategory,
  setCategoryFlag,
  type CategoryFormState,
} from "@/app/admin/actions/categories";
import { CategoryIcon, categoryIconNames, type CategoryIconName } from "@/components/category-icon";
import { Field, FormErrors, inputClass, SubmitButton, Toggle, useFormAction } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  parentId: string | null;
  active: boolean;
  needsConfirmation: boolean;
  depth: number;
  productCount: number;
};

function CategoryForm({
  category,
  categories,
  onDone,
}: {
  category?: CategoryRow;
  categories: CategoryRow[];
  onDone: () => void;
}) {
  const router = useRouter();
  const { state, pending, onSubmit } = useFormAction<CategoryFormState>(saveCategory, { status: "idle" });
  useEffect(() => {
    if (state.status === "saved") {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg bg-blush p-3">
      {category && <input type="hidden" name="id" value={category.id} />}
      <FormErrors errors={state.status === "error" ? state.errors : undefined} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`name-${category?.id ?? "new"}`}>
          <input id={`name-${category?.id ?? "new"}`} name="name" required defaultValue={category?.name} className={inputClass} />
        </Field>
        <Field
          label="Web address"
          htmlFor={`slug-${category?.id ?? "new"}`}
          hint={category ? "Changing this changes the page link" : "Leave blank to make one from the name"}
        >
          <input id={`slug-${category?.id ?? "new"}`} name="slug" defaultValue={category?.slug} className={inputClass} />
        </Field>
        <Field label="Inside" htmlFor={`parent-${category?.id ?? "new"}`}>
          <select id={`parent-${category?.id ?? "new"}`} name="parentId" defaultValue={category?.parentId ?? ""} className={inputClass}>
            <option value="">Top level (shown in the menu)</option>
            {categories
              .filter((option) => option.id !== category?.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {" ".repeat(option.depth)}
                  {option.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Icon" htmlFor={`icon-${category?.id ?? "new"}`} hint="Shown on the homepage tiles">
          <select id={`icon-${category?.id ?? "new"}`} name="icon" defaultValue={category?.icon ?? "PackageOpen"} className={inputClass}>
            {categoryIconNames.map((icon) => (
              <option key={icon} value={icon}>
                {icon.replace(/([a-z])([A-Z0-9])/g, "$1 $2")}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Toggle name="active" label="Show in the store" defaultChecked={category?.active ?? true} />
      <Toggle
        name="needsConfirmation"
        label="Needs confirmation"
        hint="A reminder that this category isn't confirmed for launch yet. Shoppers still see it if it's shown."
        defaultChecked={category?.needsConfirmation ?? false}
      />
      <div className="flex gap-2">
        <SubmitButton pending={pending}>{category ? "Save" : "Add category"}</SubmitButton>
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const run = (task: () => Promise<void>) =>
    startTransition(async () => {
      await task();
      router.refresh();
    });

  const siblings = (row: CategoryRow) => categories.filter((other) => other.parentId === row.parentId);

  return (
    <div className="flex flex-col gap-4">
      {editing === "new" ? (
        <CategoryForm categories={categories} onDone={() => setEditing(null)} />
      ) : (
        <Button type="button" variant="rose" className="self-start" onClick={() => setEditing("new")}>
          Add category
        </Button>
      )}
      <ul className="flex flex-col gap-1">
        {categories.map((row) => {
          const group = siblings(row);
          const position = group.findIndex((other) => other.id === row.id);
          return (
            <li key={row.id} className="rounded-lg bg-white" style={{ marginLeft: `${row.depth * 1}rem` }}>
              <div className="flex flex-wrap items-center gap-2 p-2">
                {row.depth === 0 && (
                  <CategoryIcon name={row.icon as CategoryIconName} className="size-5 text-rose-dark" strokeWidth={1.5} />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm text-ink ${row.depth === 0 ? "font-medium" : ""} ${row.active ? "" : "line-through opacity-60"}`}>
                    {row.name}
                  </p>
                  <p className="text-xs text-muted">
                    {row.productCount} product{row.productCount === 1 ? "" : "s"} · /{row.slug}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <label className="flex h-10 items-center gap-1.5 px-1 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={row.active}
                      disabled={busy}
                      onChange={(event) => run(() => setCategoryFlag(row.id, "active", event.target.checked))}
                      className="size-5 accent-ink"
                    />
                    Shown
                  </label>
                  <label className="flex h-10 items-center gap-1.5 px-1 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={row.needsConfirmation}
                      disabled={busy}
                      onChange={(event) =>
                        run(() => setCategoryFlag(row.id, "needsConfirmation", event.target.checked))
                      }
                      className="size-5 accent-ink"
                    />
                    Unconfirmed
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${row.name} up`}
                    disabled={busy || position === 0}
                    onClick={() => run(() => moveCategory(row.id, "up"))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${row.name} down`}
                    disabled={busy || position === group.length - 1}
                    onClick={() => run(() => moveCategory(row.id, "down"))}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.name}`}
                    onClick={() => setEditing(editing === row.id ? null : row.id)}
                  >
                    <Pencil />
                  </Button>
                </div>
              </div>
              {editing === row.id && (
                <div className="p-2 pt-0">
                  <CategoryForm category={row} categories={categories} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
