"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { isNigerianState, normalizePhone } from "@/lib/nigeria";
import { SETTINGS_TAG } from "@/lib/settings";

export type SettingsState = { status: "idle" | "saved" | "error"; errors?: string[] };

const settingsInput = z.object({
  whatsappNumber: z.string().trim(),
  notificationEmails: z.array(z.email("Each alert email must be a valid email address")).max(10),
  bankName: z.string().trim().max(80),
  bankAccountName: z.string().trim().max(120),
  bankAccountNumber: z.string().trim().regex(/^(\d{10})?$/, "Account number must be 10 digits"),
  enabledPaymentMethods: z
    .array(z.enum(["BANK_TRANSFER", "PAY_ON_DELIVERY"]))
    .min(1, "Turn on at least one payment method"),
  podStates: z.array(z.string().refine(isNigerianState, "Unknown state")),
  announcement: z.string().trim().min(1, "Enter the announcement bar text").max(120),
  deliveryNote: z.string().trim().min(1, "Enter the delivery note").max(400),
});

/** Owner only. Bank details live only in the database, never in code. */
export async function saveSettings(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireAdmin("OWNER");
  const parsed = settingsInput.safeParse({
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    notificationEmails: String(formData.get("notificationEmails") ?? "")
      .split(/[,\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    bankName: String(formData.get("bankName") ?? ""),
    bankAccountName: String(formData.get("bankAccountName") ?? ""),
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").replace(/\s/g, ""),
    enabledPaymentMethods: formData.getAll("enabledPaymentMethods").map(String),
    podStates: formData.getAll("podStates").map(String),
    announcement: String(formData.get("announcement") ?? ""),
    deliveryNote: String(formData.get("deliveryNote") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] };
  }
  const input = parsed.data;
  const whatsappNumber = normalizePhone(input.whatsappNumber);
  if (!whatsappNumber) return { status: "error", errors: ["Enter a valid WhatsApp number, e.g. 0811 633 6407"] };
  const bankFields = [input.bankName, input.bankAccountName, input.bankAccountNumber];
  if (bankFields.some(Boolean) && !bankFields.every(Boolean)) {
    return { status: "error", errors: ["Fill in all three bank details, or leave all three empty."] };
  }
  if (input.enabledPaymentMethods.includes("PAY_ON_DELIVERY") && input.podStates.length === 0) {
    return { status: "error", errors: ["Choose at least one state for pay on delivery, or turn it off."] };
  }

  const data = {
    ...input,
    whatsappNumber,
    bankName: input.bankName || null,
    bankAccountName: input.bankAccountName || null,
    bankAccountNumber: input.bankAccountNumber || null,
    updatedBy: admin.email,
  };
  await prisma.storeSettings.upsert({ where: { id: "store" }, update: data, create: { id: "store", ...data } });
  updateTag(SETTINGS_TAG);
  return { status: "saved" };
}
