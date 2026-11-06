import Papa from "papaparse";
import { NextResponse, type NextRequest } from "next/server";

import { getPhotoChecklist } from "@/lib/admin/photo-checklist";
import { AdminAccessError, requireAdmin } from "@/lib/auth/admin";

/** CSV for whoever takes the photos: which product, and what to name the file. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.reason === "signed-out" ? 401 : 403 });
    }
    throw error;
  }
  const rows = await getPhotoChecklist(request.nextUrl.searchParams.get("missing") === "1");
  const csv = Papa.unparse({
    fields: ["category", "product", "brand", "options", "file_name", "extra_photos", "photos_now"],
    data: rows.map((row) => [
      row.category,
      row.product,
      row.brand,
      row.options,
      `${row.sku}.jpg`,
      `${row.sku}-1.jpg, ${row.sku}-2.jpg`,
      String(row.photos),
    ]),
  });
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atmh-photo-checklist.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
