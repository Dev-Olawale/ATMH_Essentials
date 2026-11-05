"use client";

import { sendMagicLink, type LoginState } from "@/app/admin/login/actions";
import { Field, inputClass, SubmitButton, useFormAction } from "@/components/admin/ui";

export function LoginForm() {
  const { state, pending, onSubmit } = useFormAction<LoginState>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p role="status" className="rounded-lg bg-blush-deep p-4 text-sm text-ink">
        {state.message}
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Email address" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      {state.status === "error" && (
        <p role="alert" className="border-l-2 border-rose-dark pl-2 text-ink text-sm">
          {state.message}
        </p>
      )}
      <SubmitButton pending={pending} pendingLabel="Sending…">Email me a sign-in link</SubmitButton>
    </form>
  );
}
