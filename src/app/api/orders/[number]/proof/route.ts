import { randomUUID } from "node:crypto";

import { after } from "next/server";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { notifyOrder } from "@/lib/orders/notify";
import { loadOrderForViewer } from "@/lib/orders/viewer";
import { PAYMENT_PROOF_BUCKET, PAYMENT_PROOF_MAX_BYTES, PAYMENT_PROOF_TYPES } from "@/lib/payment-proofs";
import { rateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Receipt upload from the order page. Stored in the private bucket; only admins can open it. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/orders/[number]/proof">) {
  const { number } = await params;
  const form = await request.formData().catch(() => null);
  const key = form?.get("key");
  const found = await loadOrderForViewer(number, typeof key === "string" ? key : null);
  if (!found) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const { order } = found;
  if (order.paymentMethod !== "BANK_TRANSFER" || order.status !== "AWAITING_PAYMENT") {
    return NextResponse.json({ error: "This order isn't waiting for a bank transfer." }, { status: 409 });
  }

  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a photo or PDF of your receipt." }, { status: 400 });
  }
  const extension = PAYMENT_PROOF_TYPES[file.type];
  if (!extension) return NextResponse.json({ error: "Upload a photo (JPG, PNG) or a PDF." }, { status: 415 });
  if (file.size > PAYMENT_PROOF_MAX_BYTES) {
    return NextResponse.json({ error: "That file is over 10MB." }, { status: 413 });
  }
  if (!(await rateLimit("proof", order.id, 10, 60 * 60))) {
    return NextResponse.json({ error: "Too many uploads. Please message us on WhatsApp." }, { status: 429 });
  }

  const path = `orders/${order.id}/${randomUUID()}.${extension}`;
  const { error } = await createSupabaseAdminClient()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });

  await prisma.paymentProof.create({
    data: {
      orderId: order.id,
      path,
      fileName: file.name.slice(0, 120),
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });
  after(() => notifyOrder(order.id, "admin-payment-proof"));
  return NextResponse.json({ ok: true });
}
