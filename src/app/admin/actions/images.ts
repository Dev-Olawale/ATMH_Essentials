"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/product-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Uploads go through the Route Handler at /api/admin/products/[id]/images (it streams progress).

export async function updateImageAlt(imageId: string, alt: string): Promise<void> {
  await requireAdmin();
  await prisma.productImage.update({
    where: { id: String(imageId) },
    data: { alt: String(alt).trim().slice(0, 200) },
  });
  updateTag(CATALOG_TAG);
}

/** Moves a photo one place earlier or later. The first photo is the main one. */
export async function moveImage(imageId: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const image = await prisma.productImage.findUnique({ where: { id: String(imageId) } });
  if (!image) return;
  const images = await prisma.productImage.findMany({
    where: { productId: image.productId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const from = images.findIndex((candidate) => candidate.id === image.id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= images.length) return;
  [images[from], images[to]] = [images[to], images[from]];
  await prisma.$transaction(
    images.map((candidate, sortOrder) =>
      prisma.productImage.update({ where: { id: candidate.id }, data: { sortOrder } }),
    ),
  );
  updateTag(CATALOG_TAG);
}

export async function deleteImage(imageId: string): Promise<void> {
  await requireAdmin();
  const image = await prisma.productImage.findUnique({ where: { id: String(imageId) } });
  if (!image) return;
  await createSupabaseAdminClient().storage.from(PRODUCT_IMAGE_BUCKET).remove([image.path]);
  await prisma.productImage.delete({ where: { id: image.id } });
  updateTag(CATALOG_TAG);
}
