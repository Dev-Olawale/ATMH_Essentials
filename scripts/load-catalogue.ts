/**
 * Loads the starting catalogue (data/catalogue.csv, admin import format) into the database.
 * Safe to re-run:
 * - creates missing categories from prisma/catalogue/categories.ts;
 * - matches existing products by SKU (then by web address) and creates the rest;
 * - never deletes anything, never changes stock counts of existing options;
 * - never touches a product the owner has edited: reviewed (price and stock), or has photos;
 * - marks everything as real (isSample = false), since the sample-data feature is gone.
 *
 *   npm run catalogue:check   # dry run: shows what would change, writes nothing
 *   npm run catalogue:load    # applies it
 */
import { existsSync, readFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { categories as categoryTree } from "../prisma/catalogue/categories";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Subcategory } from "../src/lib/catalog-types";
import { formatNaira } from "../src/lib/format";
import { parseProductsCsv, type ImportProduct } from "../src/lib/products-csv";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const dryRun = process.argv.includes("--dry-run");
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL (or DATABASE_URL).");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const CSV_PATH = "data/catalogue.csv";

type Node = Subcategory & { icon?: string; needsConfirmation?: boolean };

/** Creates any missing category; returns "root" / "root/sub" path → id for every category. */
async function ensureCategories(): Promise<Map<string, string>> {
  const paths = new Map<string, string>();
  let created = 0;
  async function walk(node: Node, parentId: string | null, rootSlug: string | null, sortOrder: number) {
    const path = rootSlug ? `${rootSlug}/${node.slug}` : node.slug;
    let row = await prisma.category.findFirst({ where: { parentId, slug: node.slug } });
    if (!row && !dryRun) {
      row = await prisma.category.create({
        data: {
          slug: node.slug,
          name: node.name,
          icon: node.icon ?? "PackageOpen",
          parentId,
          sortOrder,
          needsConfirmation: node.needsConfirmation ?? false,
        },
      });
    }
    if (!row) created++;
    paths.set(path, row?.id ?? `new:${path}`);
    for (const [index, child] of (node.children ?? []).entries()) {
      await walk(child, row?.id ?? `new:${path}`, rootSlug ?? node.slug, index);
    }
  }
  for (const [index, category] of categoryTree.entries()) await walk(category, null, null, index);
  // Categories the owner added in the admin can be used in the CSV too.
  const all = await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } });
  const byId = new Map(all.map((row) => [row.id, row]));
  for (const row of all) {
    let root = row;
    while (root.parentId) root = byId.get(root.parentId)!;
    const path = root.id === row.id ? row.slug : `${root.slug}/${row.slug}`;
    if (!paths.has(path)) paths.set(path, row.id);
  }
  if (created) console.log(`${dryRun ? "Would create" : "Created"} ${created} missing categories.`);
  return paths;
}

type Outcome = "created" | "updated" | "skipped-edited" | "skipped-conflict";

/** False only before the `reviewed` migration is applied (a dry run can still preview). */
let hasReviewed = true;

async function loadProduct(product: ImportProduct, tagIds: Map<string, string>): Promise<Outcome> {
  const skus = product.variants.map((variant) => variant.sku);
  const owners = await prisma.productVariant.findMany({
    where: { sku: { in: skus } },
    select: { productId: true },
  });
  const ownerIds = [...new Set(owners.map((owner) => owner.productId))];
  if (ownerIds.length > 1) return "skipped-conflict";
  const where = ownerIds[0] ? { id: ownerIds[0] } : { slug: product.slug };
  const existing = await prisma.product.findUnique({
    where,
    select: { id: true, ...(hasReviewed && { reviewed: true }), _count: { select: { images: true } } },
  });

  const reviewed = Boolean(existing && "reviewed" in existing && existing.reviewed);
  if (existing && (reviewed || existing._count.images > 0)) return "skipped-edited";
  if (dryRun) return existing ? "updated" : "created";

  const slugTaken = await prisma.product.findFirst({ where: { slug: product.slug, NOT: { id: existing?.id ?? "" } } });
  if (slugTaken) return "skipped-conflict";

  await prisma.$transaction(async (tx) => {
    const fields = {
      slug: product.slug,
      name: product.name,
      brand: product.brand ?? "",
      description: product.description ?? "",
      active: product.active ?? true,
      isSample: false,
    };
    const { id } = existing
      ? await tx.product.update({ where: { id: existing.id }, data: fields })
      : await tx.product.create({ data: { ...fields, featured: product.featured ?? false, reviewed: false } });

    const sortStart = existing ? await tx.productVariant.count({ where: { productId: id } }) : 0;
    for (const [index, variant] of product.variants.entries()) {
      const data = {
        label: variant.label,
        priceKobo: variant.priceKobo,
        compareAtKobo: variant.compareAtKobo ?? null,
        lowStockThreshold: variant.lowStockThreshold ?? 5,
        isSample: false,
      };
      await tx.productVariant.upsert({
        where: { sku: variant.sku },
        // Stock of an existing option is never changed: the owner manages it.
        update: data,
        create: { ...data, sku: variant.sku, productId: id, stockQty: variant.stockQty, sortOrder: sortStart + index },
      });
    }
    if (product.categoryIds) {
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productCategory.createMany({
        data: [...new Set(product.categoryIds)].map((categoryId, sortOrder) => ({ productId: id, categoryId, sortOrder })),
      });
    }
    await tx.productTag.deleteMany({ where: { productId: id } });
    if (product.tags?.length) {
      await tx.productTag.createMany({ data: product.tags.map((name) => ({ productId: id, tagId: tagIds.get(name)! })) });
    }
  });
  return existing ? "updated" : "created";
}

async function main() {
  console.log(dryRun ? "DRY RUN: nothing will be written.\n" : "Loading the catalogue.\n");
  const column = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'reviewed'`;
  hasReviewed = column[0].n > 0;
  if (!hasReviewed && !dryRun) throw new Error("Run the migrations first: npm run db:migrate");
  const paths = await ensureCategories();
  const parsed = parseProductsCsv(readFileSync(CSV_PATH, "utf8"), paths);
  if (parsed.errors.length > 0) {
    for (const issue of parsed.errors) console.error(`Line ${issue.line}: ${issue.message}`);
    throw new Error(`${CSV_PATH} has errors; nothing was loaded.`);
  }

  if (!dryRun) {
    // The sample-data feature is gone: everything in the shop is real now.
    for (const table of ["products", "product_variants", "product_images", "categories", "tags"]) {
      await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "isSample" = false WHERE "isSample"`);
    }
  }

  const tagIds = new Map<string, string>();
  for (const name of new Set(parsed.products.flatMap((product) => product.tags ?? []))) {
    if (dryRun) tagIds.set(name, name);
    else tagIds.set(name, (await prisma.tag.upsert({ where: { name }, update: {}, create: { name } })).id);
  }

  const outcomes = new Map<Outcome, string[]>();
  for (const product of parsed.products) {
    const outcome = await loadProduct(product, tagIds);
    outcomes.set(outcome, [...(outcomes.get(outcome) ?? []), product.slug]);
  }

  // Per top-level category, counted the way the store counts (a product can be in several).
  const pathById = new Map([...paths].map(([path, id]) => [id, path]));
  const perCategory = new Map<string, Set<string>>();
  for (const product of parsed.products) {
    for (const id of product.categoryIds ?? []) {
      const root = (pathById.get(id) ?? "").split("/")[0];
      perCategory.set(root, (perCategory.get(root) ?? new Set()).add(product.slug));
    }
  }

  console.log(`CSV: ${parsed.products.length} products, ${parsed.products.reduce((n, p) => n + p.variants.length, 0)} options\n`);
  console.log("Products per category (CSV):");
  for (const category of categoryTree) console.log(`  ${category.name.padEnd(28)} ${perCategory.get(category.slug)?.size ?? 0}`);
  console.log(`\n${dryRun ? "Would create" : "Created"}: ${outcomes.get("created")?.length ?? 0}`);
  console.log(`${dryRun ? "Would update" : "Updated"}: ${outcomes.get("updated")?.length ?? 0}`);
  console.log(`Skipped, edited by the owner (reviewed or has photos): ${outcomes.get("skipped-edited")?.length ?? 0} ${outcomes.get("skipped-edited")?.join(", ") ?? ""}`);
  console.log(`Skipped, SKU or web address clash: ${outcomes.get("skipped-conflict")?.length ?? 0} ${outcomes.get("skipped-conflict")?.join(", ") ?? ""}`);

  if (dryRun) {
    console.log("\nExample rows:");
    const sample = parsed.products.filter((_, index) => index % Math.ceil(parsed.products.length / 10) === 0).slice(0, 10);
    for (const product of sample) {
      const variants = product.variants.map((v) => `${v.label} ${formatNaira(v.priceKobo)} [${v.sku}]`).join("; ");
      const cats = (product.categoryIds ?? []).map((id) => pathById.get(id)).join(" | ");
      console.log(`  • ${product.name} — ${product.brand || "(generic)"} — ${cats}\n      ${variants}${product.tags?.length ? `  tags: ${product.tags.join(", ")}` : ""}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
