import { randomUUID } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import sharp, { type OutputInfo } from "sharp";

import { AdminAccessError, requireAdmin } from "@/lib/auth/admin";
import { CATALOG_TAG } from "@/lib/catalog-db";
import { prisma } from "@/lib/db";
import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_EDGE,
  productImageUrl,
} from "@/lib/product-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Receives one photo (already shrunk in the browser), normalises it on the server
 * (rotation, max 1600px, WebP) and stores it in the public product-images bucket.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/admin/api/products/[id]/images">) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.reason === "signed-out" ? 401 : 403 });
    }
    throw error;
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo received." }, { status: 400 });
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Photo is over 10MB." }, { status: 413 });
  }

  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({
        width: PRODUCT_IMAGE_MAX_EDGE,
        height: PRODUCT_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return NextResponse.json({ error: "That file is not a photo we can read." }, { status: 415 });
  }

  const path = `products/${product.id}/${randomUUID()}.webp`;
  const { error } = await createSupabaseAdminClient()
    .storage.from(PRODUCT_IMAGE_BUCKET)
    .upload(path, output.data, { contentType: "image/webp", cacheControl: "604800", upsert: false });
  if (error) return NextResponse.json({ error: "Upload failed. Try again." }, { status: 502 });

  const last = await prisma.productImage.findFirst({
    where: { productId: product.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const alt = String(form?.get("alt") ?? "").trim().slice(0, 200) || product.name;
  const image = await prisma.productImage.create({
    data: {
      productId: product.id,
      url: productImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, path),
      path,
      alt,
      width: output.info.width,
      height: output.info.height,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  revalidateTag(CATALOG_TAG, { expire: 0 });
  return NextResponse.json({ id: image.id, url: image.url });
}
