/** Shared by the upload route, the admin viewer and the bucket setup script. */

/** Private bucket: no public URLs. Admins view files through short-lived signed links. */
export const PAYMENT_PROOF_BUCKET = "payment-proofs";

export const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024;

export const PAYMENT_PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};
