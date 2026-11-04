import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** A per-request Supabase client that reads and refreshes the signed-in user's session cookies. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only. proxy.ts refreshes them.
          }
        },
      },
    },
  );
}
