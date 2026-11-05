/**
 * Creates (or updates) the Storage buckets. Safe to re-run.
 *
 * product-images (public): anyone can load a product photo by URL.
 * payment-proofs (private): no public URLs; admins see files through short-lived signed links.
 * Writes to both: storage.objects has RLS on and no insert/update/delete policies, so only the
 * server (SUPABASE_SECRET_KEY) can upload or delete.
 *
 * Run from your laptop: npm run setup:storage
 */
import { existsSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import {
  PAYMENT_PROOF_BUCKET,
  PAYMENT_PROOF_MAX_BYTES,
  PAYMENT_PROOF_TYPES,
} from "../src/lib/payment-proofs";
import { PRODUCT_IMAGE_BUCKET, PRODUCT_IMAGE_MAX_BYTES } from "../src/lib/product-images";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");

const supabase = createClient(url, secret, { auth: { persistSession: false } });

const buckets = [
  {
    name: PRODUCT_IMAGE_BUCKET,
    options: {
      public: true,
      fileSizeLimit: PRODUCT_IMAGE_MAX_BYTES,
      allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    },
  },
  {
    name: PAYMENT_PROOF_BUCKET,
    options: {
      public: false,
      fileSizeLimit: PAYMENT_PROOF_MAX_BYTES,
      allowedMimeTypes: Object.keys(PAYMENT_PROOF_TYPES),
    },
  },
];

async function main() {
  for (const { name, options } of buckets) {
    const { data: existing } = await supabase.storage.getBucket(name);
    const { error } = existing
      ? await supabase.storage.updateBucket(name, options)
      : await supabase.storage.createBucket(name, options);
    if (error) throw error;
    console.log(`${existing ? "Updated" : "Created"} ${options.public ? "public" : "private"} bucket "${name}".`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
