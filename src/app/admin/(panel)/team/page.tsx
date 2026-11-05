import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { TeamManager } from "@/components/admin/team-manager";
import { isAdminEmail as isBootstrapOwner } from "@/lib/auth/admin-emails";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Team" };

async function Team() {
  const me = await requireAdminPage("OWNER");
  const members = await prisma.adminUser.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }] });
  return (
    <TeamManager
      members={members.map((member) => ({
        id: member.id,
        email: member.email,
        role: member.role,
        isYou: member.id === me.id,
        protectedOwner: isBootstrapOwner(member.email),
      }))}
    />
  );
}

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Team"
        description="Who can use this admin. Shoppers' accounts never get access unless you add them here."
      />
      <Suspense fallback={<AdminLoading />}>
        <Team />
      </Suspense>
    </>
  );
}
