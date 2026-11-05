"use client";

import { saveSettings, type SettingsState } from "@/app/admin/actions/settings";
import { Field, FormErrors, inputClass, SubmitButton, useFormAction } from "@/components/admin/ui";
import { NIGERIAN_STATES } from "@/lib/nigeria";

export type SettingsValues = {
  whatsappNumber: string;
  notificationEmails: string[];
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  enabledPaymentMethods: string[];
  podStates: string[];
  announcement: string;
  deliveryNote: string;
};

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const { state, pending, onSubmit } = useFormAction<SettingsState>(saveSettings, { status: "idle" });
  const section = "flex flex-col gap-4 rounded-xl bg-white p-4";
  const heading = "font-sans text-sm font-medium tracking-widest uppercase";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormErrors errors={state.status === "error" ? state.errors : undefined} />
      {state.status === "saved" && (
        <p role="status" className="rounded-lg bg-blush-deep p-3 text-sm text-ink">
          Settings saved. The store uses them straight away.
        </p>
      )}

      <section className={section}>
        <h2 className={heading}>Contact and alerts</h2>
        <Field label="Store WhatsApp number" htmlFor="whatsappNumber" hint="Used for the WhatsApp button and order messages">
          <input id="whatsappNumber" name="whatsappNumber" type="tel" defaultValue={initial.whatsappNumber} className={inputClass} />
        </Field>
        <Field
          label="Emails for new-order alerts"
          htmlFor="notificationEmails"
          hint="Separate with commas. Leave empty to alert every owner."
        >
          <input id="notificationEmails" name="notificationEmails" defaultValue={initial.notificationEmails.join(", ")} className={inputClass} />
        </Field>
      </section>

      <section className={section}>
        <h2 className={heading}>Bank details for transfers</h2>
        <p className="text-xs text-muted">
          Shown to customers only after you confirm their delivery fee. Leave all three empty until you&apos;re ready.
        </p>
        <Field label="Bank name" htmlFor="bankName">
          <input id="bankName" name="bankName" defaultValue={initial.bankName} autoComplete="off" className={inputClass} />
        </Field>
        <Field label="Account name" htmlFor="bankAccountName">
          <input id="bankAccountName" name="bankAccountName" defaultValue={initial.bankAccountName} autoComplete="off" className={inputClass} />
        </Field>
        <Field label="Account number (10 digits)" htmlFor="bankAccountNumber">
          <input id="bankAccountNumber" name="bankAccountNumber" inputMode="numeric" defaultValue={initial.bankAccountNumber} autoComplete="off" className={inputClass} />
        </Field>
      </section>

      <section className={section}>
        <h2 className={heading}>Payment methods</h2>
        {(
          [
            ["BANK_TRANSFER", "Bank transfer"],
            ["PAY_ON_DELIVERY", "Pay on delivery"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border border-blush-deep p-3 text-sm">
            <input
              type="checkbox"
              name="enabledPaymentMethods"
              value={value}
              defaultChecked={initial.enabledPaymentMethods.includes(value)}
              className="size-5 accent-ink"
            />
            {label}
          </label>
        ))}
        <p className="text-xs text-muted">Card payments (Paystack) will appear here once they&apos;re set up.</p>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">States where pay on delivery is offered</legend>
          <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-blush-deep p-2 sm:grid-cols-3">
            {NIGERIAN_STATES.map((name) => (
              <label key={name} className="flex min-h-10 items-center gap-2 rounded px-2 text-sm hover:bg-blush">
                <input type="checkbox" name="podStates" value={name} defaultChecked={initial.podStates.includes(name)} className="size-5 accent-ink" />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className={section}>
        <h2 className={heading}>Store messages</h2>
        <Field label="Announcement bar" htmlFor="announcement" hint="The thin black bar at the top of every page">
          <input id="announcement" name="announcement" maxLength={120} defaultValue={initial.announcement} className={inputClass} />
        </Field>
        <Field label="Delivery note" htmlFor="deliveryNote" hint="Shown at checkout next to the order total">
          <textarea id="deliveryNote" name="deliveryNote" rows={3} maxLength={400} defaultValue={initial.deliveryNote} className={`${inputClass} h-auto py-2`} />
        </Field>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-blush-deep bg-blush/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <SubmitButton pending={pending}>Save settings</SubmitButton>
      </div>
    </form>
  );
}
