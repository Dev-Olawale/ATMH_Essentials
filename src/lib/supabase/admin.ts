import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase with the SECRET key: bypasses Row Level Security. Server code only, and only
 * after requireAdmin() has passed. `server-only` makes any client-side import a build error.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase URL or secret key is not set.");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
