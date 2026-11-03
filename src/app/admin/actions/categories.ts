"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { categoryIconNames } from "@/components/category-icon";
import { requireAdmin } from "@/lib/auth/admin";
import { getCategoryTree, rootOf } from "@/lib/admin/category-tree";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { slugify } from "@/lib/catalog-types";
import { prisma } from "@/lib/db";

export type CategoryFormState = { status: "idle" | "saved" | "error"; errors?: string[] };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categoryInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Enter a category name").max(80),
  slug: z.string().trim().toLowerCase().regex(SLUG, "Web address: lowercase letters, numbers and dashes only"),
  parentId: z.string().nullable(),
  icon: z.enum(categoryIconNames as [string, ...string[]]),
  active: z.boolean(),
  needsConfirmation: z.boolean(),
  isSample: z.boolean(),
});

export async function saveCategory(
  _state: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "");
  const parsed = categoryInput.safeParse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    name,
    slug: String(formData.get("slug") ?? "").trim() || slugify(name),
    parentId: formData.get("parentId") ? String(formData.get("parentId")) : null,
    icon: String(formData.get("icon") ?? "PackageOpen"),
    active: formData.get("active") === "on",
    needsConfirmation: formData.get("needsConfirmation") === "on",
    isSample: formData.get("isSample") === "on",
  });
  if (!parsed.success) {
    return { status: "error", errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] };
  }
  const input = parsed.data;
  const tree = await getCategoryTree();
  const errors: string[] = [];

  if (input.id && !tree.some((node) => node.id === input.id)) errors.push("This category no longer exists");
  if (input.parentId && !tree.some((node) => node.id === input.parentId)) {
    errors.push("The parent category no longer exists");
  }
  // A category cannot move under itself or one of its own subcategories.
  if (input.id && input.parentId) {
    let cursor: string | null = input.parentId;
    while (cursor) {
      if (cursor === input.id) {
        errors.push("A category cannot sit inside itself");
        break;
      }
      cursor = tree.find((node) => node.id === cursor)?.parentId ?? null;
    }
  }
  // Store URLs are /category/<top>/<sub>, so a slug must be unique within its top-level tree.
  const ownRoot = input.parentId ? rootOf(tree, input.parentId)?.id : input.id;
  const clash = tree.find((node) => {
    if (node.id === input.id || node.slug !== input.slug) return false;
    if (!input.parentId) return node.parentId === null;
    return node.parentId !== null && rootOf(tree, node.id)?.id === ownRoot;
  });
  if (clash) errors.push(`Another category here already uses the web address "${input.slug}"`);
  if (errors.length > 0) return { status: "error", errors };

  const { id, ...data } = input;
  if (id) {
    await prisma.category.update({ where: { id }, data });
  } else {
    const siblings = tree.filter((node) => node.parentId === input.parentId);
    await prisma.category.create({
      data: { ...data, sortOrder: Math.max(-1, ...siblings.map((node) => node.sortOrder)) + 1 },
    });
  }
  updateTag(CATALOG_TAG);
  return { status: "saved" };
}

/** Moves a category one place up or down among its siblings. */
export async function moveCategory(categoryId: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const category = await prisma.category.findUnique({ where: { id: String(categoryId) } });
  if (!category) return;
  const siblings = await prisma.category.findMany({
    where: { parentId: category.parentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const from = siblings.findIndex((sibling) => sibling.id === category.id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= siblings.length) return;
  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
  await prisma.$transaction(
    siblings.map((sibling, sortOrder) =>
      prisma.category.update({ where: { id: sibling.id }, data: { sortOrder } }),
    ),
  );
  updateTag(CATALOG_TAG);
}

export async function setCategoryFlag(
  categoryId: string,
  flag: "active" | "needsConfirmation",
  value: boolean,
): Promise<void> {
  await requireAdmin();
  if (flag !== "active" && flag !== "needsConfirmation") return;
  await prisma.category.update({ where: { id: String(categoryId) }, data: { [flag]: Boolean(value) } });
  updateTag(CATALOG_TAG);
}
