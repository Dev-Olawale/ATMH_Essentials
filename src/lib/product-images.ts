/** Shared by the uploader (browser), the upload route (server) and the bucket setup script. */

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Largest photo the owner can pick, before it is resized. */
export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Longest edge after resizing. */
export const PRODUCT_IMAGE_MAX_EDGE = 1600;

export const PRODUCT_IMAGE_TIP = "Best results: square photo, plain light background, good lighting.";

/** Public URL of an object in the bucket, e.g. for next/image. */
export function productImageUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`;
}
