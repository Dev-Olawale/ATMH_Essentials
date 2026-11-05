import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/db";
import type { PaymentMethodId } from "@/lib/payments/methods";

/** Admin → Settings calls updateTag(SETTINGS_TAG) so the store updates straight away. */
export const SETTINGS_TAG = "settings";

/** Used if the settings row is missing (it is created by the migration). */
const DEFAULTS = {
  whatsappNumber: "2348116336407",
  announcement: "Nationwide delivery",
  deliveryNote:
    "We deliver nationwide. The delivery fee depends on your location and is confirmed after you order.",
  enabledPaymentMethods: ["BANK_TRANSFER", "PAY_ON_DELIVERY"] as PaymentMethodId[],
  podStates: ["Lagos"],
};

/** What every visitor may see. Bank details and alert emails are deliberately not here. */
export type PublicSettings = typeof DEFAULTS;

export async function getPublicSettings(): Promise<PublicSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  const row = await prisma.storeSettings.findUnique({
    where: { id: "store" },
    select: {
      whatsappNumber: true,
      announcement: true,
      deliveryNote: true,
      enabledPaymentMethods: true,
      podStates: true,
    },
  });
  return row ?? DEFAULTS;
}

/** Everything, including bank details. Server-only, never cached, never sent to the browser whole. */
export async function getPrivateSettings() {
  const row = await prisma.storeSettings.findUnique({ where: { id: "store" } });
  return {
    ...DEFAULTS,
    notificationEmails: [] as string[],
    bankName: null as string | null,
    bankAccountName: null as string | null,
    bankAccountNumber: null as string | null,
    ...row,
  };
}

export type BankDetails = { bankName: string; accountName: string; accountNumber: string };

/** Bank details only when all three are filled in. */
export function bankDetailsFrom(settings: {
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
}): BankDetails | null {
  const { bankName, bankAccountName, bankAccountNumber } = settings;
  return bankName && bankAccountName && bankAccountNumber
    ? { bankName, accountName: bankAccountName, accountNumber: bankAccountNumber }
    : null;
}
