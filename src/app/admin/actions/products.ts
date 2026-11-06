"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import { nairaToKobo } from "@/lib/money";

export type FormState = { status: "idle" | "saved" | "error"; errors?: string[] };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const variantInput = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Each option needs a name, e.g. 500ml").max(80),
  sku: z.string().trim().regex(SKU, "Each SKU must be letters, numbers, dots, dashes or underscores"),
  price: z.string(),
  compareAt: z.string(),
  stock: z.string(),
  lowStockThreshold: z.string(),
});

const productInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Enter a product name").max(160),
  slug: z.string().trim().toLowerCase().regex(SLUG, "Web address: lowercase letters, numbers and dashes only"),
  brand: z.string().trim().max(80),
  description: z.string().trim().max(4000),
  featured: z.boolean(),
  active: z.boolean(),
  reviewed: z.boolean(),
  categoryIds: z.array(z.string()).max(20),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20),
  variants: z.array(variantInput).min(1, "Add at least one option with a price").max(50),
});

function readForm(formData: FormData) {
  let variants: unknown = [];
  try {
    variants = JSON.parse(String(formData.get("variants") ?? "[]"));
  } catch {
    // Reported by validation below.
  }
  const extraTags = String(formData.get("extraTags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    description: String(formData.get("description") ?? ""),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    reviewed: formData.get("reviewed") === "on",
    categoryIds: formData.getAll("categoryIds").map(String),
    tags: [...new Set([...formData.getAll("tags").map(String), ...extraTags])],
    variants,
  };
}

export async function saveProduct(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = productInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { status: "error", errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] };
  }
  const input = parsed.data;
  const errors: string[] = [];

  const variants = input.variants.map((variant, index) => {
    const n = index + 1;
    const priceKobo = nairaToKobo(variant.price);
    if (priceKobo === null || priceKobo === 0) errors.push(`Option ${n}: enter a price in naira, e.g. 2500`);
    let compareAtKobo: number | null = null;
    if (variant.compareAt.trim()) {
      compareAtKobo = nairaToKobo(variant.compareAt);
      if (compareAtKobo === null) errors.push(`Option ${n}: "was" price must be an amount`);
      else if (priceKobo !== null && compareAtKobo <= priceKobo) {
        errors.push(`Option ${n}: "was" price must be higher than the price`);
      }
    }
    const stockQty = /^\d{1,9}$/.test(variant.stock.trim()) ? Number(variant.stock) : null;
    if (stockQty === null) errors.push(`Option ${n}: stock must be a whole number, 0 or more`);
    const lowStockThreshold = /^\d{1,9}$/.test(variant.lowStockThreshold.trim())
      ? Number(variant.lowStockThreshold)
      : null;
    if (lowStockThreshold === null) errors.push(`Option ${n}: low-stock alert must be a whole number`);
    return {
      id: variant.id,
      label: variant.label,
      sku: variant.sku,
      priceKobo: priceKobo ?? 0,
      compareAtKobo,
      stockQty: stockQty ?? 0,
      lowStockThreshold: lowStockThreshold ?? 0,
      sortOrder: index,
    };
  });

  const skus = variants.map((variant) => variant.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) errors.push("Each option needs its own SKU");

  const existing = input.id
    ? await prisma.product.findUnique({ where: { id: input.id }, include: { variants: true } })
    : null;
  if (input.id && !existing) errors.push("This product no longer exists");

  const slugOwner = await prisma.product.findUnique({ where: { slug: input.slug } });
  if (slugOwner && slugOwner.id !== input.id) errors.push("Another product already uses this web address");

  const skuOwners = await prisma.productVariant.findMany({
    where: { sku: { in: variants.map((variant) => variant.sku) } },
    select: { sku: true, productId: true },
  });
  for (const owner of skuOwners) {
    if (owner.productId !== input.id) errors.push(`SKU ${owner.sku} belongs to another product`);
  }
  const ownVariantIds = new Set(existing?.variants.map((variant) => variant.id));
  if (variants.some((variant) => variant.id && !ownVariantIds.has(variant.id))) {
    errors.push("An option no longer exists. Reload the page and try again.");
  }

  const validCategories = await prisma.category.count({ where: { id: { in: input.categoryIds } } });
  if (validCategories !== new Set(input.categoryIds).size) errors.push("A selected category no longer exists");

  if (errors.length > 0) return { status: "error", errors };

  const tagIds = await Promise.all(
    input.tags.map(
      async (name) =>
        (await prisma.tag.upsert({ where: { name }, update: {}, create: { name } })).id,
    ),
  );

  const fields = {
    name: input.name,
    slug: input.slug,
    brand: input.brand,
    description: input.description,
    featured: input.featured,
    active: input.active,
    reviewed: input.reviewed,
  };

  const productId = await prisma.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: fields })
      : await tx.product.create({ data: fields });

    const keep = new Set(variants.flatMap((variant) => (variant.id ? [variant.id] : [])));
    await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: [...keep] } } });
    // Free SKUs first, so options can swap SKUs within one save.
    for (const variant of variants.filter((v) => v.id)) {
      await tx.productVariant.update({ where: { id: variant.id }, data: { sku: `tmp-${variant.id}` } });
    }
    for (const { id, ...data } of variants) {
      if (id) {
        await tx.productVariant.update({ where: { id }, data });
      } else {
        await tx.productVariant.create({ data: { ...data, productId: product.id } });
      }
    }

    await tx.productCategory.deleteMany({ where: { productId: product.id } });
    await tx.productCategory.createMany({
      data: [...new Set(input.categoryIds)].map((categoryId, sortOrder) => ({
        productId: product.id,
        categoryId,
        sortOrder,
      })),
    });
    await tx.productTag.deleteMany({ where: { productId: product.id } });
    await tx.productTag.createMany({ data: tagIds.map((tagId) => ({ productId: product.id, tagId })) });
    return product.id;
  });

  updateTag(CATALOG_TAG);
  redirect(`/admin/products/${productId}?saved=${existing ? "updated" : "created"}`);
}

/** Archive hides a product from the store but keeps it (and its order history). */
export async function setProductActive(productId: string, active: boolean): Promise<void> {
  await requireAdmin();
  await prisma.product.update({ where: { id: String(productId) }, data: { active: Boolean(active) } });
  updateTag(CATALOG_TAG);
}

export async function updateVariantStock(variantId: string, stock: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!Number.isSafeInteger(stock) || stock < 0) return { ok: false };
  await prisma.productVariant.update({ where: { id: String(variantId) }, data: { stockQty: stock } });
  updateTag(CATALOG_TAG);
  return { ok: true };
}
