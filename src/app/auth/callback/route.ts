import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Only send people back into the admin, never to another site. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

/**
 * Where the magic link lands. Supports both link styles Supabase can send:
 * `?code=` (the default email template) and `?token_hash=&type=` (a custom template).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing code") };

  if (error) return NextResponse.redirect(`${origin}/admin/login?error=link`);
  return NextResponse.redirect(`${origin}${next}`);
}
