import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session cookie fresh on admin, account, checkout and order pages, and sends
 * signed-out visitors away from /admin early. This is a convenience, not the security boundary:
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

  // Roles live in the database and are checked by every admin page, action and route.
  if (data?.claims) return response;
  if (pathname.startsWith("/admin/api/")) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "?error=signed-out";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*", "/account/:path*", "/checkout", "/order/:path*"],
};
