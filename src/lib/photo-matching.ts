/** Matching photo files to products by SKU, for the bulk photo upload. Pure, so it is unit-tested. */

export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export type SkuOwner = { productId: string; productName: string };

export type PhotoMatch = {
  fileName: string;
  /** The SKU the file matched, as written in the shop. */
  sku: string | null;
  product: SkuOwner | null;
  /** 0 for the main photo (SKU.jpg), 1 for SKU-1.jpg, and so on. */
  index: number;
};

function baseName(fileName: string): string {
  const name = fileName.split(/[\\/]/).pop() ?? fileName;
  return name.replace(/\.[^.]+$/, "").trim().toLowerCase();
}

export function isPhotoFile(fileName: string): boolean {
  const name = fileName.split(/[\\/]/).pop() ?? "";
  if (name.startsWith(".") || fileName.includes("__MACOSX")) return false;
  return PHOTO_EXTENSIONS.includes(name.split(".").pop()?.toLowerCase() ?? "");
}

/**
 * "ARL-PWD-900.jpg" → ARL-PWD-900 (main photo); "arl-pwd-900-2.JPG" → ARL-PWD-900, photo 2.
 * An exact SKU always wins, because some SKUs end in a number themselves (e.g. GIL-BL2-5).
 */
export function matchPhotoFile(fileName: string, skus: Map<string, SkuOwner & { sku: string }>): PhotoMatch {
  const base = baseName(fileName);
  const exact = skus.get(base);
  if (exact) return { fileName, sku: exact.sku, product: { productId: exact.productId, productName: exact.productName }, index: 0 };
  const suffix = /^(.*?)[-_ ](\d{1,2})$/.exec(base);
  const owner = suffix ? skus.get(suffix[1]) : undefined;
  if (suffix && owner) {
    return { fileName, sku: owner.sku, product: { productId: owner.productId, productName: owner.productName }, index: Number(suffix[2]) };
  }
  return { fileName, sku: null, product: null, index: 0 };
}

/** Matched photos in upload order: per product, the main photo first, then -1, -2… */
export function orderForUpload<T extends PhotoMatch>(matches: T[]): T[] {
  return matches
    .filter((match) => match.product)
    .sort(
      (a, b) =>
        a.product!.productId.localeCompare(b.product!.productId) ||
        a.index - b.index ||
        a.fileName.localeCompare(b.fileName),
    );
}

export function skuIndex(rows: { sku: string; productId: string; productName: string }[]) {
  return new Map(rows.map((row) => [row.sku.toLowerCase(), row]));
}
