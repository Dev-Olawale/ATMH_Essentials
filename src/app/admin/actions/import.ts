"use server";

import { updateTag } from "next/cache";

import { getCategoryPathMap } from "@/lib/admin/category-tree";
import { requireAdmin } from "@/lib/auth/admin";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import {
  hasBlockingErrors,
  parseProductsCsv,
  type ImportIssue,
  type ImportProduct,
} from "@/lib/products-csv";

export type ImportPreview = {
  errors: ImportIssue[];
  blocking: boolean;
  summary: { productsNew: number; productsUpdated: number; variantsNew: number; variantsUpdated: number };
  rows: {
    line: number;
    slug: string;
    name: string;
    isNew: boolean;
    variants: { sku: string; label: string; priceKobo: number; stockQty: number; isNew: boolean }[];
  }[];
};

const MAX_CSV_BYTES = 2 * 1024 * 1024;

/** Validates the file and checks it against the database. Writes nothing. */
async function analyse(csvText: string) {
  const text = String(csvText ?? "");
  if (text.length > MAX_CSV_BYTES) {
    const errors = [{ line: 1, message: "File is over 2MB. Split it into smaller files." }];
    return { parsed: { products: [] as ImportProduct[], errors }, existingSlugs: new Map(), existingSkus: new Map() };
  }
  const parsed = parseProductsCsv(text, await getCategoryPathMap());

  const existingProducts = await prisma.product.findMany({
    where: { slug: { in: parsed.products.map((product) => product.slug) } },
    select: { id: true, slug: true },
  });
  const existingSlugs = new Map(existingProducts.map((product) => [product.slug, product.id]));
  const allSkus = parsed.products.flatMap((product) => product.variants.map((variant) => variant.sku));
  const variantRows = await prisma.productVariant.findMany({
    where: { sku: { in: allSkus } },
    select: { id: true, sku: true, productId: true },
  });
  const existingSkus = new Map(variantRows.map((variant) => [variant.sku, variant]));

  for (const product of parsed.products) {
    const productId = existingSlugs.get(product.slug);
    for (const variant of product.variants) {
      const owner = existingSkus.get(variant.sku);
      if (owner && owner.productId !== productId) {
        parsed.errors.push({ line: variant.line, message: `SKU ${variant.sku} already belongs to another product` });
      }
    }
  }
  parsed.errors.sort((a, b) => a.line - b.line);
  return { parsed, existingSlugs, existingSkus };
}

export async function previewProductImport(csvText: string): Promise<ImportPreview> {
  await requireAdmin();
  const { parsed, existingSlugs, existingSkus } = await analyse(csvText);
  const rows = parsed.products.map((product) => ({
    line: product.line,
    slug: product.slug,
    name: product.name,
    isNew: !existingSlugs.has(product.slug),
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      label: variant.label,
      priceKobo: variant.priceKobo,
      stockQty: variant.stockQty,
      isNew: !existingSkus.has(variant.sku),
    })),
  }));
  const variants = rows.flatMap((row) => row.variants);
  return {
    errors: parsed.errors,
    blocking: hasBlockingErrors(parsed),
    summary: {
      productsNew: rows.filter((row) => row.isNew).length,
      productsUpdated: rows.filter((row) => !row.isNew).length,
      variantsNew: variants.filter((variant) => variant.isNew).length,
      variantsUpdated: variants.filter((variant) => !variant.isNew).length,
    },
    rows: rows.slice(0, 200),
  };
}

export type ImportResult = { ok: boolean; message: string; errors?: ImportIssue[] };

/** Re-validates on the server, then writes every product in its own transaction. */
export async function applyProductImport(csvText: string): Promise<ImportResult> {
  await requireAdmin();
  const { parsed, existingSlugs } = await analyse(csvText);
  if (hasBlockingErrors(parsed)) {
    return { ok: false, message: "Nothing was imported. Fix the errors and try again.", errors: parsed.errors };
  }

  const tagIds = new Map<string, string>();
  for (const name of new Set(parsed.products.flatMap((product) => product.tags ?? []))) {
    tagIds.set(name, (await prisma.tag.upsert({ where: { name }, update: {}, create: { name } })).id);
  }

  let done = 0;
  for (const product of parsed.products) {
    await prisma.$transaction(async (tx) => {
      const fields = {
        name: product.name,
        ...(product.brand !== undefined && { brand: product.brand }),
        ...(product.description !== undefined && { description: product.description }),
        ...(product.featured !== undefined && { featured: product.featured }),
        ...(product.active !== undefined && { active: product.active }),
      };
      const existingId = existingSlugs.get(product.slug);
      const { id } = existingId
        ? await tx.product.update({ where: { id: existingId }, data: fields })
        : await tx.product.create({ data: { slug: product.slug, ...fields } });

      const sortStart = await tx.productVariant.count({ where: { productId: id } });
      for (const [index, variant] of product.variants.entries()) {
        const data = {
          label: variant.label,
          priceKobo: variant.priceKobo,
          stockQty: variant.stockQty,
          ...(variant.compareAtKobo !== undefined && { compareAtKobo: variant.compareAtKobo }),
          ...(variant.lowStockThreshold !== undefined && { lowStockThreshold: variant.lowStockThreshold }),
        };
        await tx.productVariant.upsert({
          where: { sku: variant.sku },
          update: data,
          create: { ...data, sku: variant.sku, productId: id, sortOrder: sortStart + index },
        });
      }
      if (product.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        await tx.productCategory.createMany({
          data: [...new Set(product.categoryIds)].map((categoryId, sortOrder) => ({
            productId: id,
            categoryId,
            sortOrder,
          })),
        });
      }
      if (product.tags) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        await tx.productTag.createMany({
          data: product.tags.map((name) => ({ productId: id, tagId: tagIds.get(name)! })),
        });
      }
    });
    done++;
  }

  updateTag(CATALOG_TAG);
  return { ok: true, message: `Imported ${done} product${done === 1 ? "" : "s"}.` };
}
