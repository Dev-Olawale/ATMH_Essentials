import "server-only";

import { redirect } from "next/navigation";

import { isAdminEmail as isBootstrapOwner } from "@/lib/auth/admin-emails";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRoleId = "OWNER" | "STAFF";

export class AdminAccessError extends Error {
  constructor(readonly reason: "signed-out" | "not-allowed" | "owner-only") {
    super(
      reason === "signed-out"
        ? "Sign in to continue."
        : reason === "owner-only"
          ? "Only the owner can do this."
          : "This account has no admin access.",
    );
    this.name = "AdminAccessError";
  }
}

export type AdminUser = { id: string; email: string; role: AdminRoleId };

/**
 * Admin access comes only from the admin_users table. Signing up as a customer never creates
 * a row there. ADMIN_EMAILS is a bootstrap list: those emails are always kept as OWNER so the
 * shop can never be locked out.
 */
export async function findAdmin(authUserId: string, rawEmail: string): Promise<AdminUser | null> {
  const email = rawEmail.trim().toLowerCase();
  const row = await prisma.adminUser.findUnique({ where: { email } });
  if (isBootstrapOwner(email)) {
    if (row?.role === "OWNER" && row.authUserId === authUserId) return { id: row.id, email, role: "OWNER" };
    try {
      const kept = await prisma.adminUser.upsert({
        where: { email },
        update: { role: "OWNER", authUserId },
        create: { email, role: "OWNER", authUserId, invitedBy: "ADMIN_EMAILS" },
      });
      return { id: kept.id, email, role: "OWNER" };
    } catch (error) {
      // The layout and the page check access at the same time; on a first sign-in both may try to
      // create the row. The loser of that race just reads what the winner wrote.
      if ((error as { code?: string }).code !== "P2002") throw error;
      const created = await prisma.adminUser.findUnique({ where: { email } });
      if (!created) throw error;
      return { id: created.id, email, role: "OWNER" };
    }
  }
  if (!row) return null;
  // A row belongs to one Supabase user. If the email was re-registered, it needs a fresh invite.
  if (row.authUserId && row.authUserId !== authUserId) return null;
  if (!row.authUserId) {
    // Same race as above for an invited admin's first sign-in: only link the account if still unlinked.
    await prisma.adminUser.updateMany({ where: { id: row.id, authUserId: null }, data: { authUserId } });
  }
  return { id: row.id, email, role: row.role };
}

type AdminCheck = { user: AdminUser } | { error: AdminAccessError };

/** Asks Supabase Auth to verify the session (not just trusting the cookie), then looks up the role. */
async function checkAdmin(role?: "OWNER"): Promise<AdminCheck> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) return { error: new AdminAccessError("signed-out") };
  const admin = await findAdmin(user.id, user.email);
  if (!admin) return { error: new AdminAccessError("not-allowed") };
  if (role === "OWNER" && admin.role !== "OWNER") return { error: new AdminAccessError("owner-only") };
  return { user: admin };
}

/**
 * The guard for every admin Server Action and Route Handler. Call it first, before reading input
 * or touching data. Pass "OWNER" for team and settings actions.
 */
export async function requireAdmin(role?: "OWNER"): Promise<AdminUser> {
  const result = await checkAdmin(role);
  if ("error" in result) throw result.error;
  return result.user;
}

/** The guard for every admin page: signed-out or non-admin visitors go to the sign-in page. */
export async function requireAdminPage(role?: "OWNER"): Promise<AdminUser> {
  const result = await checkAdmin(role);
  if ("error" in result) {
    redirect(
      result.error.reason === "owner-only"
        ? "/admin?error=owner-only"
        : `/admin/login?error=${result.error.reason}`,
    );
  }
  return result.user;
}
