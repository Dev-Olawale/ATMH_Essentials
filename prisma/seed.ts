/**
 * Loads the SAMPLE categories and products into the database. Every record gets isSample = true,
 * so the admin's "Remove all sample data" can delete them later.
 *
 * Safe to re-run: it only creates what is missing and never overwrites existing records,
 * so edits made in the admin survive.
 *
 * Run from your laptop: npx prisma db seed
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import type { Subcategory } from "../src/lib/catalog-types";
import { categories } from "./sample-data/categories";
import { products } from "./sample-data/products";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL (or DATABASE_URL) before seeding.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const created = { categories: 0, products: 0, variants: 0, tags: 0 };

async function ensureCategory(
  node: Subcategory & { icon?: string; needsConfirmation?: boolean },
  parentId: string | null,
  sortOrder: number,
): Promise<void> {
  let category = await prisma.category.findFirst({ where: { parentId, slug: node.slug } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        slug: node.slug,
        name: node.name,
        icon: node.icon ?? "PackageOpen",
        parentId,
        sortOrder,
        needsConfirmation: node.needsConfirmation ?? false,
        isSample: true,
      },
    });
    created.categories++;
  }
  for (const [index, child] of (node.children ?? []).entries()) {
    await ensureCategory(child, category.id, index);
  }
}

/** Finds a category by its top-level slug and an optional subcategory slug anywhere beneath it. */
async function findCategoryId(rootSlug: string, subSlug?: string): Promise<string> {
  const root = await prisma.category.findFirst({ where: { parentId: null, slug: rootSlug } });
  if (!root) throw new Error(`Unknown category ${rootSlug}`);
  if (!subSlug) return root.id;
  const queue = [root.id];
  while (queue.length > 0) {
    const children = await prisma.category.findMany({ where: { parentId: queue.shift()! } });
    const match = children.find((child) => child.slug === subSlug);
    if (match) return match.id;
    queue.push(...children.map((child) => child.id));
  }
  throw new Error(`Unknown subcategory ${rootSlug}/${subSlug}`);
}

async function ensureTag(name: string): Promise<string> {
  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing) return existing.id;
  created.tags++;
  return (await prisma.tag.create({ data: { name, isSample: true } })).id;
}

async function main() {
  for (const [index, category] of categories.entries()) {
    await ensureCategory(category, null, index);
  }

  for (const sample of products) {
    if (await prisma.product.findUnique({ where: { slug: sample.slug } })) continue;

    const categoryIds = await Promise.all(
      sample.categories.map((ref) => findCategoryId(ref.category, ref.subcategory)),
    );
    const tagIds = await Promise.all(sample.tags.map(ensureTag));
    const skusTaken = await prisma.productVariant.findMany({
      where: { sku: { in: sample.variants.map((variant) => variant.sku) } },
      select: { sku: true },
    });
    if (skusTaken.length > 0) {
      console.warn(`Skipping ${sample.slug}: SKU already used (${skusTaken[0].sku}).`);
      continue;
    }

    await prisma.product.create({
      data: {
        slug: sample.slug,
        name: sample.name,
        brand: sample.brand,
        description: sample.description,
        active: sample.active,
        popularity: sample.popularity,
        createdAt: new Date(sample.createdAt),
        isSample: true,
        variants: {
          create: sample.variants.map((variant, index) => ({
            sku: variant.sku,
            label: variant.label,
            priceKobo: variant.priceKobo,
            compareAtKobo: variant.compareAtKobo ?? null,
            stockQty: variant.stockQty,
            lowStockThreshold: sample.lowStockThreshold,
            sortOrder: index,
            isSample: true,
          })),
        },
        categories: {
          create: [...new Set(categoryIds)].map((categoryId, index) => ({
            categoryId,
            sortOrder: index,
          })),
        },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    created.products++;
    created.variants += sample.variants.length;
  }

  console.log("Sample data seeded (only missing records were created):", created);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
