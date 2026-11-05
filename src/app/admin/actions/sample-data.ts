"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/product-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SampleRemovalState = { status: "idle" | "done" | "error"; message?: string };

/**
 * Deletes only records marked isSample: sample products (with their options, photos and links),
 * unused sample tags and, if asked, sample categories that hold none of the owner's products.
 */
export async function removeSampleData(
  _state: SampleRemovalState,
  formData: FormData,
): Promise<SampleRemovalState> {
  await requireAdmin("OWNER");
  if (formData.get("confirm") !== "REMOVE") {
    return { status: "error", message: 'Type REMOVE in capitals to confirm.' };
  }
  const includeCategories = formData.get("includeCategories") === "on";

  const sampleProducts = await prisma.product.findMany({ where: { isSample: true }, select: { id: true } });
  const productIds = sampleProducts.map((product) => product.id);
  const images = await prisma.productImage.findMany({
    where: { OR: [{ productId: { in: productIds } }, { isSample: true }] },
    select: { id: true, path: true },
  });

  // Files first: if storage fails, nothing in the database has changed and it can be retried.
  if (images.length > 0) {
    const storage = createSupabaseAdminClient().storage.from(PRODUCT_IMAGE_BUCKET);
    for (let i = 0; i < images.length; i += 100) {
      const { error } = await storage.remove(images.slice(i, i + 100).map((image) => image.path));
      if (error) return { status: "error", message: "Could not delete sample photos. Try again." };
    }
  }

  const removed = await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { id: { in: images.map((image) => image.id) } } });
    // Sample options left on products the owner has taken over.
    const variants = await tx.productVariant.deleteMany({
      where: { isSample: true, productId: { notIn: productIds } },
    });
    const products = await tx.product.deleteMany({ where: { id: { in: productIds } } });
    const tags = await tx.tag.deleteMany({ where: { isSample: true, products: { none: {} } } });

    let categories = 0;
    if (includeCategories) {
      // Delete leaves first, and only empty sample categories with no remaining children.
      for (;;) {
        const deletable = await tx.category.findMany({
          where: { isSample: true, products: { none: {} }, children: { none: {} } },
          select: { id: true },
        });
        if (deletable.length === 0) break;
        categories += (await tx.category.deleteMany({ where: { id: { in: deletable.map((c) => c.id) } } })).count;
      }
    }
    return { products: products.count, variants: variants.count, tags: tags.count, categories };
  }, { timeout: 30_000 });

  updateTag(CATALOG_TAG);
  const parts = [
    `${removed.products} products`,
    `${images.length} photos`,
    ...(removed.categories > 0 ? [`${removed.categories} categories`] : []),
  ];
  return { status: "done", message: `Removed ${parts.join(", ")}.` };
}
