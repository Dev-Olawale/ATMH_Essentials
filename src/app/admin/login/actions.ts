"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAdminEmail } from "@/lib/auth/admin-emails";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

const email = z.email().max(254);

/**
 * Public by design (it is the sign-in form). It only emails a link to allowlisted addresses
 * that already have an account, and gives the same answer either way so it cannot be used
 * to discover who the admins are.
 */
export async function sendMagicLink(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = email.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { status: "error", message: "Enter a valid email address." };

  if (isAdminEmail(parsed.data)) {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        // Public sign-up is off; admins are invited in Supabase first.
        shouldCreateUser: false,
        // Must match an allowed Redirect URL in Supabase Auth settings.
        emailRedirectTo: `${proto}://${host}/auth/callback?next=/admin`,
      },
    });
    if (error && error.status === 429) {
      return { status: "error", message: "Too many attempts. Wait a minute and try again." };
    }
  }
  return {
    status: "sent",
    message: "If that email has admin access, a sign-in link is on its way. Check your inbox.",
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
