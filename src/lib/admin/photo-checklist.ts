import "server-only";

import { getCategoryTree } from "@/lib/admin/category-tree";
import { prisma } from "@/lib/db";

export type ChecklistRow = {
  category: string;
  product: string;
  brand: string;
  options: string;
  /** Name the main photo <sku>.jpg; extras <sku>-1.jpg, <sku>-2.jpg. */
  sku: string;
  photos: number;
};

/** Every product, grouped by main category, with the SKU to use as the photo's file name. */
export async function getPhotoChecklist(onlyMissing: boolean): Promise<ChecklistRow[]> {
  const [tree, products] = await Promise.all([
    getCategoryTree(),
    prisma.product.findMany({
      where: { active: true, ...(onlyMissing && { images: { none: {} } }) },
      include: {
        variants: { orderBy: { sortOrder: "asc" }, select: { sku: true, label: true } },
        categories: { orderBy: { sortOrder: "asc" }, take: 1, select: { categoryId: true } },
        _count: { select: { images: true } },
      },
    }),
  ]);
  const byId = new Map(tree.map((node) => [node.id, node]));
  const rootName = (id?: string) => {
    let node = id ? byId.get(id) : undefined;
    while (node?.parentId) node = byId.get(node.parentId);
    return node?.name ?? "Uncategorised";
  };
  return products
    .filter((product) => product.variants.length > 0)
    .map((product) => ({
      category: rootName(product.categories[0]?.categoryId),
      product: product.name,
      brand: product.brand,
      options: product.variants.map((variant) => variant.label).join(", "),
      sku: product.variants[0].sku,
      photos: product._count.images,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.product.localeCompare(b.product));
}
