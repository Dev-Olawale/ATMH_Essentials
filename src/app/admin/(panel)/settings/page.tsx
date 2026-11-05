import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoading, PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdminPage } from "@/lib/auth/admin";
import { getPrivateSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

async function Settings() {
  await requireAdminPage("OWNER");
  const settings = await getPrivateSettings();
  return (
    <SettingsForm
      // Remount after saving so the fields show what was stored.
      key={"updatedAt" in settings && settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : "initial"}
      initial={{
        whatsappNumber: settings.whatsappNumber,
        notificationEmails: settings.notificationEmails,
        bankName: settings.bankName ?? "",
        bankAccountName: settings.bankAccountName ?? "",
        bankAccountNumber: settings.bankAccountNumber ?? "",
        enabledPaymentMethods: settings.enabledPaymentMethods,
        podStates: settings.podStates,
        announcement: settings.announcement,
        deliveryNote: settings.deliveryNote,
      }}
    />
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Owner only. Changes show in the store straight away." />
      <Suspense fallback={<AdminLoading />}>
        <Settings />
      </Suspense>
    </>
  );
}
