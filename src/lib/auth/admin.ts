import "server-only";

import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/auth/admin-emails";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class AdminAccessError extends Error {
  constructor(readonly reason: "signed-out" | "not-allowed") {
    super(reason === "signed-out" ? "Sign in to continue." : "This account has no admin access.");
    this.name = "AdminAccessError";
  }
}

export type AdminUser = { id: string; email: string };

type AdminCheck = { user: AdminUser } | { error: AdminAccessError };

/**
 * Asks Supabase Auth to verify the session (getUser checks with the server rather than trusting
 * the cookie), then checks the email against ADMIN_EMAILS.
 */
async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) return { error: new AdminAccessError("signed-out") };
  if (!isAdminEmail(user.email)) return { error: new AdminAccessError("not-allowed") };
  return { user: { id: user.id, email: user.email } };
}

/**
 * The guard for every admin Server Action and Route Handler. Call it first, before reading
 * input or touching the database. Throws AdminAccessError when access is denied.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const result = await checkAdmin();
  if ("error" in result) throw result.error;
  return result.user;
}

/** The guard for every admin page: sends signed-out or non-admin visitors to the sign-in page. */
export async function requireAdminPage(): Promise<AdminUser> {
  const result = await checkAdmin();
  if ("error" in result) redirect(`/admin/login?error=${result.error.reason}`);
  return result.user;
}
