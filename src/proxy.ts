import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAdminEmail } from "@/lib/auth/admin-emails";

/**
 * Keeps the Supabase session cookie fresh on admin and auth routes, and sends signed-out
 * visitors to the sign-in page early. This is a convenience, not the security boundary:
 * every admin page, Server Action and Route Handler checks access itself (src/lib/auth/admin.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  // Verifies the token and refreshes it when needed. Must run before any other logic.
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return response;

  const reason = !data?.claims ? "signed-out" : !isAdminEmail(data.claims.email) ? "not-allowed" : null;
  if (!reason) return response;
  if (pathname.startsWith("/admin/api/")) {
    const status = reason === "signed-out" ? 401 : 403;
    return NextResponse.json({ error: "No admin access." }, { status });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?error=${reason}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
