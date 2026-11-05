import "server-only";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerUser = { id: string; email: string };

/**
 * The signed-in shopper, verified with Supabase Auth, or null. Being signed in as a customer
 * grants nothing in /admin: admin access is only ever looked up in admin_users.
 */
export async function getCustomerUser(): Promise<CustomerUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

/** For /account pages: sends signed-out visitors to the sign-in page. Creates the profile row. */
export async function requireCustomerPage(next = "/account"): Promise<CustomerUser> {
  const user = await getCustomerUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  await ensureCustomer(user);
  return user;
}

export async function ensureCustomer(user: CustomerUser) {
  try {
    return await prisma.customer.upsert({
      where: { id: user.id },
      update: {},
      create: { id: user.id, email: user.email },
    });
  } catch (error) {
    // Two requests on a first visit can both try to create the row; the second one reads it.
    if ((error as { code?: string }).code !== "P2002") throw error;
    return prisma.customer.findUniqueOrThrow({ where: { id: user.id } });
  }
}
