"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitPaymentReference } from "@/app/(store)/order/actions";
import { Button } from "@/components/ui/button";

const fieldClass =
  "h-12 w-full rounded-lg border border-blush-deep bg-white px-3 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** Upload a receipt or type the transfer reference. Either is enough for us to check. */
export function PaymentProofForm({ orderNumber, accessKey }: { orderNumber: string; accessKey: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();

  const upload = (file: File) =>
    startTransition(async () => {
      setMessage(null);
      const body = new FormData();
      body.append("file", file);
      if (accessKey) body.append("key", accessKey);
      try {
        const response = await fetch(`/api/orders/${orderNumber}/proof`, { method: "POST", body });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(
          response.ok
            ? { ok: true, text: "Thank you! We've received your receipt and will confirm your payment soon." }
            : { ok: false, text: result.error ?? "Upload failed. Please try again." },
        );
        if (response.ok) router.refresh();
      } catch {
        setMessage({ ok: false, text: "No connection. Check your internet and try again." });
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-ink px-4 text-sm font-medium tracking-wide text-ink uppercase">
        {pending ? "Uploading…" : "Upload receipt (photo or PDF)"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
            event.target.value = "";
          }}
        />
      </label>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setMessage(null);
            const result = await submitPaymentReference({ number: orderNumber, key: accessKey, reference });
            setMessage(
              result.ok
                ? { ok: true, text: "Thank you! We'll check your transfer and confirm soon." }
                : { ok: false, text: result.error },
            );
            if (result.ok) {
              setReference("");
              router.refresh();
            }
          });
        }}
      >
        <label htmlFor="transfer-reference" className="sr-only">
          Transfer reference
        </label>
        <input
          id="transfer-reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Or type your transfer reference"
          className={fieldClass}
        />
        <Button type="submit" size="lg" variant="outline" disabled={pending || reference.trim().length < 4}>
          Send
        </Button>
      </form>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-ink" : "border-l-2 border-rose-dark pl-2 text-ink"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
