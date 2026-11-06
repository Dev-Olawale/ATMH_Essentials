import type { Metadata } from "next";
import { Suspense } from "react";

import { BulkPhotoUpload } from "@/components/admin/bulk-photo-upload";
import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Bulk photo upload" };

async function BulkPhotos() {
  await requireAdminPage();
  const variants = await prisma.productVariant.findMany({
    select: { sku: true, product: { select: { id: true, name: true } } },
  });
  return (
    <BulkPhotoUpload
      skus={variants.map((variant) => ({
        sku: variant.sku,
        productId: variant.product.id,
        productName: variant.product.name,
      }))}
    />
  );
}

export default function BulkPhotosPage() {
  return (
    <>
      <PageHeader
        title="Bulk photo upload"
        description="Photos are matched to products by SKU, cleaned up on this device, and only uploaded when you press Upload."
      />
      <Suspense fallback={<AdminLoading />}>
        <BulkPhotos />
      </Suspense>
    </>
  );
}
