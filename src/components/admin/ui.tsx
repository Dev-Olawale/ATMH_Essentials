"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** Small building blocks shared by the admin screens. Plain styling, large touch targets. */

export const inputClass =
  "h-11 w-full rounded-lg border border-blush-deep bg-white px-3 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 rounded-lg border border-blush-deep bg-white p-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 accent-ink" />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function FormErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-rose-dark bg-blush p-3 text-sm text-ink">
      <p className="font-medium">Please fix the following:</p>
      <ul className="mt-1 list-disc pl-5">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export { useFormAction } from "@/lib/use-form-action";

export function SubmitButton({
  children,
  pending: pendingProp,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  /** Pass when the form uses useFormAction; otherwise the form's own status is used. */
  pending?: boolean;
  pendingLabel?: string;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function Badge({ tone = "muted", children }: { tone?: "muted" | "gold" | "rose"; children: React.ReactNode }) {
  const tones = {
    muted: "bg-blush-deep text-ink",
    gold: "bg-gold text-ink",
    rose: "bg-rose-dark text-white",
  };
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[0.6875rem] font-medium tracking-wide uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}
