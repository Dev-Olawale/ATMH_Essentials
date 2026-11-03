/**
 * Creates (or updates) the public "product-images" Storage bucket. Safe to re-run.
 *
 * Public read: anyone can load a product photo by URL.
 * Writes: storage.objects has RLS on and no insert/update/delete policies, so only the
 * server (SUPABASE_SECRET_KEY) can upload or delete.
 *
 * Run from your laptop: npm run setup:storage
 */
import { existsSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { PRODUCT_IMAGE_BUCKET, PRODUCT_IMAGE_MAX_BYTES } from "../src/lib/product-images";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");

const supabase = createClient(url, secret, { auth: { persistSession: false } });

const options = {
  public: true,
  fileSizeLimit: PRODUCT_IMAGE_MAX_BYTES,
  allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
};

async function main() {
  const { data: existing } = await supabase.storage.getBucket(PRODUCT_IMAGE_BUCKET);
  const { error } = existing
    ? await supabase.storage.updateBucket(PRODUCT_IMAGE_BUCKET, options)
    : await supabase.storage.createBucket(PRODUCT_IMAGE_BUCKET, options);
  if (error) throw error;
  console.log(`${existing ? "Updated" : "Created"} public bucket "${PRODUCT_IMAGE_BUCKET}".`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
