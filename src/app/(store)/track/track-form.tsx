"use client";

import { trackOrder, type TrackState } from "@/app/(store)/track/actions";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";

const fieldClass =
  "h-12 w-full rounded-lg border border-blush-deep bg-white px-3 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function TrackForm() {
  const { state, pending, onSubmit } = useFormAction<TrackState>(trackOrder, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="track-number" className="text-sm font-medium text-ink">
          Order number
        </label>
        <input id="track-number" name="number" placeholder="ATMH-10023" required autoCapitalize="characters" className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="track-phone" className="text-sm font-medium text-ink">
          Phone number used for the order
        </label>
        <input id="track-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className={fieldClass} />
      </div>
      {state.error && (
        <p role="alert" className="border-l-2 border-rose-dark pl-2 text-ink text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Finding your order…" : "Track order"}
      </Button>
    </form>
  );
}
