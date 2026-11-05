import { NextResponse } from "next/server";

import { AdminAccessError, requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { PAYMENT_PROOF_BUCKET } from "@/lib/payment-proofs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Opens a receipt from the private bucket through a link that expires after a minute. Admins only. */
export async function GET(_request: Request, { params }: RouteContext<"/admin/api/orders/[id]/proofs/[proofId]">) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.reason === "signed-out" ? 401 : 403 });
    }
    throw error;
  }
  const { id, proofId } = await params;
  const proof = await prisma.paymentProof.findFirst({ where: { id: proofId, orderId: id }, select: { path: true } });
  if (!proof?.path) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { data, error } = await createSupabaseAdminClient()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(proof.path, 60);
  if (error || !data) return NextResponse.json({ error: "Couldn't open the file." }, { status: 502 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
