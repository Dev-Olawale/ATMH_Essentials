"use client";

import { useActionState } from "react";

import { sendMagicLink, type LoginState } from "@/app/admin/login/actions";
import { Field, inputClass, SubmitButton } from "@/components/admin/ui";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p role="status" className="rounded-lg bg-blush-deep p-4 text-sm text-ink">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email address" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-rose-dark">
          {state.message}
        </p>
      )}
      <SubmitButton pendingLabel="Sending…">Email me a sign-in link</SubmitButton>
    </form>
  );
}
