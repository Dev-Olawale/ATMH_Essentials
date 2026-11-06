import { describe, expect, it } from "vitest";

import { isPhotoFile, matchPhotoFile, orderForUpload, skuIndex } from "@/lib/photo-matching";

const skus = skuIndex([
  { sku: "ARL-PWD-900", productId: "ariel", productName: "Ariel 900g" },
  { sku: "ARL-PWD-2K", productId: "ariel", productName: "Ariel 2kg" },
  { sku: "GIL-BL2-5", productId: "gillette", productName: "Gillette Blue II" },
  { sku: "GEN-SCB", productId: "brush", productName: "Scrubbing Brush" },
]);

describe("matchPhotoFile", () => {
  it("matches the SKU in the file name, ignoring case and extension", () => {
    expect(matchPhotoFile("arl-pwd-900.JPG", skus)).toMatchObject({ sku: "ARL-PWD-900", index: 0, product: { productId: "ariel" } });
    expect(matchPhotoFile("photos/GEN-SCB.png", skus)).toMatchObject({ sku: "GEN-SCB", index: 0 });
  });

  it("reads -1, -2 as extra photos of the same product", () => {
    expect(matchPhotoFile("ARL-PWD-900-2.jpg", skus)).toMatchObject({ sku: "ARL-PWD-900", index: 2 });
    expect(matchPhotoFile("gen-scb_1.webp", skus)).toMatchObject({ sku: "GEN-SCB", index: 1 });
  });

  it("prefers an exact SKU that happens to end in a number", () => {
    expect(matchPhotoFile("GIL-BL2-5.jpg", skus)).toMatchObject({ sku: "GIL-BL2-5", index: 0 });
    expect(matchPhotoFile("GIL-BL2-5-1.jpg", skus)).toMatchObject({ sku: "GIL-BL2-5", index: 1 });
  });

  it("reports files it can't match", () => {
    expect(matchPhotoFile("IMG_2041.jpg", skus)).toMatchObject({ sku: null, product: null });
    expect(matchPhotoFile("ARL-PWD.jpg", skus).product).toBeNull();
  });
});

describe("isPhotoFile", () => {
  it("keeps photos and skips system files and other types", () => {
    expect(["a.jpg", "b.JPEG", "c.png", "d.webp"].every(isPhotoFile)).toBe(true);
    expect(["__MACOSX/._a.jpg", ".DS_Store", "notes.txt", "list.csv", "a.heic"].some(isPhotoFile)).toBe(false);
  });
});

describe("orderForUpload", () => {
  it("puts each product's main photo first, then the numbered extras, and drops unmatched files", () => {
    const files = ["ARL-PWD-900-2.jpg", "x.jpg", "ARL-PWD-2K.jpg", "ARL-PWD-900-1.jpg"].map((name) => matchPhotoFile(name, skus));
    expect(orderForUpload(files).map((match) => match.fileName)).toEqual([
      "ARL-PWD-2K.jpg",
      "ARL-PWD-900-1.jpg",
      "ARL-PWD-900-2.jpg",
    ]);
  });
});
