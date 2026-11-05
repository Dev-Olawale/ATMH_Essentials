"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureCustomer, getCustomerUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/db";
import { isNigerianState, normalizePhone } from "@/lib/nigeria";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountState = { status: "idle" | "done" | "error"; message?: string };

/**
 * Customer sign-in and sign-up in one: a magic link to any email. This only creates a shopper
 * account. It never grants admin access, which is looked up separately in admin_users.
 */
export async function sendCustomerLink(_state: AccountState, formData: FormData): Promise<AccountState> {
  const email = z.email().max(254).safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { status: "error", message: "Enter a valid email address." };
  const next = String(formData.get("next") ?? "/account");
  const safeNext = next.startsWith("/account") || next === "/checkout" ? next : "/account";
  if (!(await rateLimit("customer-link", await clientIp(), 5, 10 * 60))) {
    return { status: "error", message: "Too many attempts. Wait a few minutes and try again." };
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${proto}://${host}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });
  if (error?.status === 429) {
    return { status: "error", message: "Too many attempts. Wait a minute and try again." };
  }
  if (error) return { status: "error", message: "We couldn't send the link. Please try again." };
  return { status: "done", message: `Check ${email.data} for your sign-in link.` };
}

async function requireCustomer() {
  const user = await getCustomerUser();
  if (!user) redirect("/account/login");
  await ensureCustomer(user);
  return user;
}

const profileInput = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().max(30),
});

export async function updateProfile(_state: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireCustomer();
  const parsed = profileInput.safeParse({ name: formData.get("name"), phone: formData.get("phone") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  if (parsed.data.phone && !normalizePhone(parsed.data.phone)) {
    return { status: "error", message: "Enter a valid phone number, e.g. 0803 123 4567" };
  }
  await prisma.customer.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/account");
  return { status: "done", message: "Saved." };
}

const addressInput = z.object({
  id: z.string().optional(),
  state: z.string().refine(isNigerianState, "Choose a state"),
  city: z.string().trim().min(2, "Enter the city or LGA").max(80),
  street: z.string().trim().min(5, "Enter the street address").max(200),
  landmark: z.string().trim().max(120),
  isDefault: z.boolean(),
});

export async function saveAddress(_state: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireCustomer();
  const parsed = addressInput.safeParse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    state: String(formData.get("state") ?? ""),
    city: formData.get("city"),
    street: formData.get("street"),
    landmark: String(formData.get("landmark") ?? ""),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { id, ...data } = parsed.data;
  const count = await prisma.address.count({ where: { customerId: user.id } });
  if (!id && count >= 10) return { status: "error", message: "You can save up to 10 addresses." };
  const makeDefault = data.isDefault || count === 0;

  await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({ where: { customerId: user.id }, data: { isDefault: false } });
    }
    if (id) {
      // Scoped to this customer: another customer's address id updates nothing.
      const { count: updated } = await tx.address.updateMany({
        where: { id, customerId: user.id },
        data: { ...data, isDefault: makeDefault },
      });
      if (updated !== 1) throw new Error("Address not found");
    } else {
      await tx.address.create({ data: { ...data, isDefault: makeDefault, customerId: user.id } });
    }
  });
  revalidatePath("/account");
  return { status: "done", message: "Address saved." };
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = await requireCustomer();
  await prisma.address.deleteMany({ where: { id: String(addressId), customerId: user.id } });
  revalidatePath("/account");
}

export async function signOutCustomer(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
