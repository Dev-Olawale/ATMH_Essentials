"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";

import { isAdminEmail as isBootstrapOwner } from "@/lib/auth/admin-emails";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { renderAdminInvite } from "@/lib/email/templates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TeamState = { status: "idle" | "done" | "error"; message?: string };

const inviteInput = z.object({
  email: z.email("Enter a valid email address").max(254),
  role: z.enum(["OWNER", "STAFF"]),
});

/**
 * Owner only. Creates the person's sign-in account (no password; they use an email link) and
 * gives them a role. If they already shop with us, their existing account is reused.
 */
export async function inviteAdmin(_state: TeamState, formData: FormData): Promise<TeamState> {
  const owner = await requireAdmin("OWNER");
  const parsed = inviteInput.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: String(formData.get("role") ?? "STAFF"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { email, role } = parsed.data;
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    return { status: "error", message: `${email} already has admin access.` };
  }

  const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({ email, email_confirm: true });
  // "Already registered" is fine: the account is linked the first time they sign in to the admin.
  if (error && error.code !== "email_exists") {
    return { status: "error", message: "Couldn't create their sign-in account. Please try again." };
  }
  await prisma.adminUser.create({
    data: { email, role, authUserId: data?.user?.id ?? null, invitedBy: owner.email },
  });

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const loginUrl = `${proto}://${host}/admin/login`;
  after(() => sendEmail("admin-invite", [email], renderAdminInvite({ role, invitedBy: owner.email, loginUrl })));

  revalidatePath("/admin/team");
  return { status: "done", message: `${email} can now sign in at /admin/login.` };
}

/** Rules shared by role changes and removals. Returns an error message, or null if allowed. */
async function protectedReason(ownerId: string, targetId: string, removingOwnerRole: boolean) {
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target) return { target: null, reason: "That person no longer has admin access." };
  if (target.id === ownerId) return { target, reason: "You can't change or remove your own access." };
  if (isBootstrapOwner(target.email)) {
    return { target, reason: "This owner is set in ADMIN_EMAILS (the safety list) and can't be changed here." };
  }
  if (removingOwnerRole && target.role === "OWNER") {
    const owners = await prisma.adminUser.count({ where: { role: "OWNER" } });
    if (owners <= 1) return { target, reason: "The shop must keep at least one owner." };
  }
  return { target, reason: null };
}

export async function changeAdminRole(adminId: string, role: "OWNER" | "STAFF"): Promise<TeamState> {
  const owner = await requireAdmin("OWNER");
  if (role !== "OWNER" && role !== "STAFF") return { status: "error", message: "Unknown role." };
  const { target, reason } = await protectedReason(owner.id, String(adminId), role === "STAFF");
  if (reason || !target) return { status: "error", message: reason ?? "Not found." };
  await prisma.adminUser.update({ where: { id: target.id }, data: { role } });
  revalidatePath("/admin/team");
  return { status: "done", message: `${target.email} is now ${role === "OWNER" ? "an owner" : "staff"}.` };
}

/** Removes admin access. Their shopper account (orders, addresses) is kept. */
export async function removeAdmin(adminId: string): Promise<TeamState> {
  const owner = await requireAdmin("OWNER");
  const { target, reason } = await protectedReason(owner.id, String(adminId), true);
  if (reason || !target) return { status: "error", message: reason ?? "Not found." };
  await prisma.adminUser.delete({ where: { id: target.id } });
  revalidatePath("/admin/team");
  return { status: "done", message: `Removed admin access for ${target.email}.` };
}
