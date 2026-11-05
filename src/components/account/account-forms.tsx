"use client";

import { useState, useTransition } from "react";

import {
  deleteAddress,
  saveAddress,
  updateProfile,
  type AccountState,
} from "@/app/(store)/account/actions";
import { Button } from "@/components/ui/button";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { useFormAction } from "@/lib/use-form-action";

const fieldClass =
  "h-12 w-full rounded-lg border border-blush-deep bg-white px-3 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

function Message({ state }: { state: AccountState }) {
  if (state.status === "idle") return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "border-l-2 border-rose-dark pl-2 text-ink" : "text-ink"}`}>
      {state.message}
    </p>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const { state, pending, onSubmit } = useFormAction<AccountState>(updateProfile, { status: "idle" });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-muted">Signed in as {email}</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium text-ink">
          Full name
        </label>
        <input id="profile-name" name="name" defaultValue={name} autoComplete="name" required className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-phone" className="text-sm font-medium text-ink">
          Phone number
        </label>
        <input id="profile-phone" name="phone" type="tel" defaultValue={phone} autoComplete="tel" inputMode="tel" className={fieldClass} />
      </div>
      <Message state={state} />
      <Button type="submit" size="lg" variant="outline" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}

export type AccountAddress = { id: string; state: string; city: string; street: string; landmark: string; isDefault: boolean };

function AddressForm({ address, onDone }: { address?: AccountAddress; onDone: () => void }) {
  const { state, pending, onSubmit } = useFormAction<AccountState>(async (previous, formData) => {
    const result = await saveAddress(previous, formData);
    if (result.status === "done") onDone();
    return result;
  }, { status: "idle" });
  const id = address?.id ?? "new";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl bg-blush p-3">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`state-${id}`} className="text-sm font-medium text-ink">
          State
        </label>
        <select id={`state-${id}`} name="state" defaultValue={address?.state ?? ""} required className={fieldClass}>
          <option value="">Choose a state</option>
          {NIGERIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
      {(
        [
          ["city", "City / LGA", address?.city],
          ["street", "Street address", address?.street],
          ["landmark", "Nearest landmark (optional)", address?.landmark],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="flex flex-col gap-1.5">
          <label htmlFor={`${name}-${id}`} className="text-sm font-medium text-ink">
            {label}
          </label>
          <input id={`${name}-${id}`} name={name} defaultValue={value} required={name !== "landmark"} className={fieldClass} />
        </div>
      ))}
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="size-5 accent-ink" />
        Use as my default address
      </label>
      <Message state={state} />
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save address"}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: AccountAddress[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 && editing !== "new" && (
        <p className="text-sm text-muted">No saved addresses yet. Add one, or tick &quot;Save this address&quot; at checkout.</p>
      )}
      <ul className="flex flex-col gap-2">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-xl border border-blush-deep p-3 text-sm">
            {editing === address.id ? (
              <AddressForm address={address} onDone={() => setEditing(null)} />
            ) : (
              <>
                <p className="text-ink">
                  {address.street}
                  {address.landmark && ` (near ${address.landmark})`}
                  <br />
                  {address.city}, {address.state}
                </p>
                {address.isDefault && <p className="mt-1 text-xs tracking-widest text-gold-dark uppercase">Default</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(address.id)}>
                    Edit
                  </Button>
                  {confirming === address.id ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => startTransition(() => deleteAddress(address.id))}
                    >
                      Yes, delete
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(address.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <AddressForm onDone={() => setEditing(null)} />
      ) : (
        <Button type="button" variant="outline" size="lg" className="self-start" onClick={() => setEditing("new")}>
          Add an address
        </Button>
      )}
    </div>
  );
}
