import "server-only";

import { prisma } from "@/lib/db";

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  needsConfirmation: boolean;
  isSample: boolean;
  depth: number;
  /** "root" or "root/subcategory": the format used in the CSV. */
  path: string;
  /** Distinct products in this category or anywhere beneath it. */
  productCount: number;
};

/** Every category (active or not) in tree order, for admin screens and the CSV importer. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [rows, links] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.productCategory.findMany({ select: { productId: true, categoryId: true } }),
  ]);
  const productsIn = new Map<string, Set<string>>();
  for (const link of links) {
    productsIn.set(link.categoryId, (productsIn.get(link.categoryId) ?? new Set()).add(link.productId));
  }
  const byParent = new Map<string | null, typeof rows>();
  for (const row of rows) {
    byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
  }

  const out: CategoryNode[] = [];
  /** Adds each category's distinct products, including its subtree; returns the subtree's set. */
  const walk = (parentId: string | null, depth: number, rootSlug: string | null): Set<string> => {
    const all = new Set<string>();
    for (const row of byParent.get(parentId) ?? []) {
      const root = rootSlug ?? row.slug;
      const node: CategoryNode = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        icon: row.icon,
        parentId: row.parentId,
        sortOrder: row.sortOrder,
        active: row.active,
        needsConfirmation: row.needsConfirmation,
        isSample: row.isSample,
        depth,
        path: rootSlug ? `${root}/${row.slug}` : row.slug,
        productCount: 0,
      };
      out.push(node);
      const inSubtree = new Set([...(productsIn.get(row.id) ?? []), ...walk(row.id, depth + 1, root)]);
      node.productCount = inSubtree.size;
      inSubtree.forEach((id) => all.add(id));
    }
    return all;
  };
  walk(null, 0, null);
  return out;
}

export async function getCategoryPathMap(): Promise<Map<string, string>> {
  return new Map((await getCategoryTree()).map((node) => [node.path, node.id]));
}

/** The top-level ancestor of a category, used to keep slugs unique within one tree. */
export function rootOf(nodes: CategoryNode[], id: string): CategoryNode | undefined {
  let node = nodes.find((candidate) => candidate.id === id);
  while (node?.parentId) node = nodes.find((candidate) => candidate.id === node!.parentId);
  return node;
}
