"use client";

import { sendCustomerLink, type AccountState } from "@/app/(store)/account/actions";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";

export function CustomerLoginForm({ next }: { next: string }) {
  const { state, pending, onSubmit } = useFormAction<AccountState>(sendCustomerLink, { status: "idle" });
  if (state.status === "done") {
    return (
      <p role="status" className="rounded-2xl bg-white p-4 text-sm text-ink">
        {state.message} The link signs you in on this device. It works once and expires within an hour.
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-6">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="customer-email" className="text-sm font-medium text-ink">
          Email address
        </label>
        <input
          id="customer-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="h-12 w-full rounded-lg border border-blush-deep bg-white px-3 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </div>
      {state.status === "error" && (
        <p role="alert" className="border-l-2 border-rose-dark pl-2 text-ink text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <p className="text-xs text-muted">New here? The same link creates your account. No password needed.</p>
    </form>
  );
}
