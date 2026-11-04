import { NextResponse } from "next/server";

import { getCategoryTree } from "@/lib/admin/category-tree";
import { AdminAccessError, requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { productsToCsv } from "@/lib/products-csv";

/** Every product (archived too), one row per option, in the import format. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.reason === "signed-out" ? 401 : 403 });
    }
    throw error;
  }

  const [tree, products] = await Promise.all([
    getCategoryTree(),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        categories: { orderBy: { sortOrder: "asc" } },
        tags: { include: { tag: true } },
      },
    }),
  ]);
  const pathById = new Map(tree.map((node) => [node.id, node.path]));

  const csv = productsToCsv(
    products.map((product) => ({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      description: product.description,
      categoryPaths: product.categories.flatMap((link) => pathById.get(link.categoryId) ?? []),
      tags: product.tags.map((link) => link.tag.name),
      featured: product.featured,
      active: product.active,
      variants: product.variants,
    })),
  );
  const date = new Date().toISOString().slice(0, 10);
  // A byte-order mark makes Excel read ₦ and accents correctly.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atmh-products-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
