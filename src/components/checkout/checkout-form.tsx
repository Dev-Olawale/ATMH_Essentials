"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { placeOrder, type PlaceOrderResult } from "@/app/(store)/checkout/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { lineTotalKobo } from "@/lib/cart";
import { clearCart, syncCart, useCart, useHydrated } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import { NIGERIAN_STATES, normalizePhone } from "@/lib/nigeria";
import { availablePaymentMethods, type PaymentMethodId, type PaymentRules } from "@/lib/payments/methods";

export type SavedAddress = { id: string; state: string; city: string; street: string; landmark: string; isDefault: boolean };

export type CheckoutPrefill = {
  signedIn: boolean;
  name: string;
  email: string;
  phone: string;
  addresses: SavedAddress[];
};

const STEPS = ["Contact", "Delivery", "Payment", "Review"] as const;

const fieldClass =
  "h-12 w-full rounded-lg border border-blush-deep bg-white px-3 text-base text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-invalid:border-rose-dark";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="border-l-2 border-rose-dark pl-2 text-ink text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

type Values = {
  name: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  street: string;
  landmark: string;
  notes: string;
  paymentMethod: PaymentMethodId | "";
  saveAddress: boolean;
};

function validate(step: number, values: Values, methods: PaymentMethodId[]): Partial<Record<keyof Values, string>> {
  const errors: Partial<Record<keyof Values, string>> = {};
  if (step === 0) {
    if (values.name.trim().length < 2) errors.name = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address";
    if (!normalizePhone(values.phone)) errors.phone = "Enter a valid phone number, e.g. 0803 123 4567";
  }
  if (step === 1) {
    if (!values.state) errors.state = "Choose your state";
    if (values.city.trim().length < 2) errors.city = "Enter your city or LGA";
    if (values.street.trim().length < 5) errors.street = "Enter your street address";
  }
  if (step === 2 && (!values.paymentMethod || !methods.includes(values.paymentMethod))) {
    errors.paymentMethod = "Choose how you'd like to pay";
  }
  return errors;
}

export function CheckoutForm({
  prefill,
  rules,
  deliveryNote,
}: {
  prefill: CheckoutPrefill;
  rules: PaymentRules;
  deliveryNote: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { lines, subtotalKobo } = useCart();
  const base = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [honeypot, setHoneypot] = useState("");
  const preferred = prefill.addresses.find((address) => address.isDefault) ?? prefill.addresses[0];
  const [addressChoice, setAddressChoice] = useState<string>(preferred?.id ?? "new");
  const [values, setValues] = useState<Values>({
    name: prefill.name,
    email: prefill.email,
    phone: prefill.phone,
    state: preferred?.state ?? "",
    city: preferred?.city ?? "",
    street: preferred?.street ?? "",
    landmark: preferred?.landmark ?? "",
    notes: "",
    paymentMethod: "",
    saveAddress: prefill.signedIn && prefill.addresses.length === 0,
  });

  const methods = values.state ? availablePaymentMethods(rules, values.state) : [];
  const methodIds = methods.map((method) => method.id);

  // Move focus to the step heading so screen readers announce the new step.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // A pay-on-delivery choice disappears if the shopper switches to a state without it.
  useEffect(() => {
    if (values.paymentMethod && !methodIds.includes(values.paymentMethod)) {
      setValues((current) => ({ ...current, paymentMethod: "" }));
    }
  }, [values.state, values.paymentMethod, methodIds]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const chooseAddress = (id: string) => {
    setAddressChoice(id);
    const saved = prefill.addresses.find((address) => address.id === id);
    setValues((current) => ({
      ...current,
      state: saved?.state ?? "",
      city: saved?.city ?? "",
      street: saved?.street ?? "",
      landmark: saved?.landmark ?? "",
      saveAddress: !saved && prefill.signedIn,
    }));
    setErrors({});
  };

  const next = () => {
    const found = validate(step, values, methodIds);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep((current) => current + 1);
  };

  const submit = () =>
    startTransition(async () => {
      setServerErrors([]);
      let result: PlaceOrderResult;
      try {
        result = await placeOrder({
          ...values,
          paymentMethod: values.paymentMethod as PaymentMethodId,
          website: honeypot,
          lines: lines.map((line) => ({ sku: line.sku, qty: line.qty, priceKobo: line.priceKobo })),
        });
      } catch {
        result = { ok: false, errors: ["We couldn't reach the shop. Check your connection and try again."] };
      }
      if (result.ok) {
        clearCart();
        router.push(result.url);
        return;
      }
      setServerErrors(result.errors);
      if (result.resync) await syncCart({ force: true });
    });

  if (!hydrated) return <div aria-hidden="true" className="h-96 animate-pulse rounded-2xl bg-white" />;
  if (lines.length === 0) {
    return (
      // Same height as the loading placeholder, so the page doesn't jump when the cart loads.
      <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-2xl bg-white px-4 py-12 text-center">
        <ShoppingBag aria-hidden="true" className="size-10 text-rose-dark" strokeWidth={1} />
        <p className="font-serif text-2xl text-ink">Your cart is empty</p>
        <Link href="/category" className={buttonVariants({ variant: "rose" })}>
          Browse categories
        </Link>
      </div>
    );
  }

  const describedBy = (key: keyof Values) => (errors[key] ? `${base}-${key}-error` : undefined);
  const input = (key: keyof Values, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`${base}-${key}`}
      value={values[key] as string}
      onChange={(event) => set(key, event.target.value as never)}
      aria-invalid={Boolean(errors[key])}
      aria-describedby={describedBy(key) ?? (props["aria-describedby"] as string | undefined)}
      className={fieldClass}
      {...props}
    />
  );
  const selectedAddressText = [values.street, values.landmark && `Landmark: ${values.landmark}`, `${values.city}, ${values.state}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr] lg:gap-10">
      <div className="flex flex-col gap-4">
        <ol className="flex gap-2 text-xs" aria-label="Checkout steps">
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={`flex-1 border-t-2 pt-2 tracking-widest uppercase ${
                index <= step ? "border-ink text-ink" : "border-blush-deep text-muted"
              }`}
            >
              <span className="sr-only">Step {index + 1} of 4: </span>
              {label}
            </li>
          ))}
        </ol>

        {!prefill.signedIn && step === 0 && (
          <p className="rounded-xl bg-white p-3 text-sm text-ink">
            Have an account?{" "}
            <Link href="/account/login?next=/checkout" className="underline">
              Sign in
            </Link>{" "}
            to use your saved addresses. Or continue as a guest.
          </p>
        )}

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step < 3) next();
            else submit();
          }}
          className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-6"
        >
          <h2 ref={headingRef} tabIndex={-1} className="font-sans text-sm font-medium tracking-widest uppercase outline-none">
            {STEPS[step]}
          </h2>

          {/* Honeypot: hidden from people and screen readers; bots tend to fill it in. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${base}-website`}>Website</label>
            <input
              id={`${base}-website`}
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          {step === 0 && (
            <>
              <Field id={`${base}-name`} label="Full name" error={errors.name}>
                {input("name", { autoComplete: "name", required: true })}
              </Field>
              <Field id={`${base}-email`} label="Email" error={errors.email} hint="We'll email your order updates here.">
                {input("email", { type: "email", autoComplete: "email", inputMode: "email", required: true, "aria-describedby": `${base}-email-hint` })}
              </Field>
              <Field id={`${base}-phone`} label="Phone number" error={errors.phone} hint="For the rider and WhatsApp updates.">
                {input("phone", { type: "tel", autoComplete: "tel", inputMode: "tel", required: true, "aria-describedby": `${base}-phone-hint` })}
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              {prefill.addresses.length > 0 && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium text-ink">Deliver to</legend>
                  {prefill.addresses.map((address) => (
                    <label key={address.id} className="flex min-h-12 items-start gap-3 rounded-lg border border-blush-deep p-3 text-sm">
                      <input
                        type="radio"
                        name="address"
                        checked={addressChoice === address.id}
                        onChange={() => chooseAddress(address.id)}
                        className="mt-0.5 size-5 accent-ink"
                      />
                      <span>
                        {address.street}
                        {address.landmark && ` (near ${address.landmark})`}, {address.city}, {address.state}
                      </span>
                    </label>
                  ))}
                  <label className="flex min-h-12 items-center gap-3 rounded-lg border border-blush-deep p-3 text-sm">
                    <input
                      type="radio"
                      name="address"
                      checked={addressChoice === "new"}
                      onChange={() => chooseAddress("new")}
                      className="size-5 accent-ink"
                    />
                    A new address
                  </label>
                </fieldset>
              )}
              {addressChoice === "new" && (
                <>
                  <Field id={`${base}-state`} label="State" error={errors.state}>
                    <select
                      id={`${base}-state`}
                      value={values.state}
                      onChange={(event) => set("state", event.target.value)}
                      aria-invalid={Boolean(errors.state)}
                      aria-describedby={describedBy("state")}
                      autoComplete="address-level1"
                      className={fieldClass}
                    >
                      <option value="">Choose your state</option>
                      {NIGERIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id={`${base}-city`} label="City / LGA" error={errors.city}>
                    {input("city", { autoComplete: "address-level2" })}
                  </Field>
                  <Field id={`${base}-street`} label="Street address" error={errors.street}>
                    {input("street", { autoComplete: "street-address" })}
                  </Field>
                  <Field id={`${base}-landmark`} label="Nearest landmark (optional)" error={errors.landmark}>
                    {input("landmark")}
                  </Field>
                  {prefill.signedIn && (
                    <label className="flex items-center gap-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={values.saveAddress}
                        onChange={(event) => set("saveAddress", event.target.checked)}
                        className="size-5 accent-ink"
                      />
                      Save this address to my account
                    </label>
                  )}
                </>
              )}
              <Field id={`${base}-notes`} label="Delivery notes (optional)">
                <textarea
                  id={`${base}-notes`}
                  rows={2}
                  value={values.notes}
                  onChange={(event) => set("notes", event.target.value)}
                  className={`${fieldClass} h-auto py-2`}
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <fieldset className="flex flex-col gap-2" aria-describedby={errors.paymentMethod ? `${base}-pay-error` : undefined}>
              <legend className="mb-1 text-sm text-muted">Delivering to {values.state}</legend>
              {methods.length === 0 && (
                <p className="text-sm text-ink">
                  No payment method is available for {values.state} right now. Please message us on WhatsApp.
                </p>
              )}
              {methods.map((method) => (
                <label key={method.id} className="flex min-h-12 items-start gap-3 rounded-lg border border-blush-deep p-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={values.paymentMethod === method.id}
                    onChange={() => set("paymentMethod", method.id)}
                    className="mt-0.5 size-5 accent-ink"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-ink">{method.label}</span>
                    <span className="text-xs text-muted">{method.description}</span>
                  </span>
                </label>
              ))}
              {rules.enabledPaymentMethods.includes("PAY_ON_DELIVERY") && !methodIds.includes("PAY_ON_DELIVERY") && (
                <p className="text-xs text-muted">Pay on delivery isn&apos;t available in {values.state} yet.</p>
              )}
              {errors.paymentMethod && (
                <p id={`${base}-pay-error`} className="border-l-2 border-rose-dark pl-2 text-ink text-sm">
                  {errors.paymentMethod}
                </p>
              )}
            </fieldset>
          )}

          {step === 3 && (
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Contact</dt>
                <dd className="text-ink">
                  {values.name} · {values.phone} · {values.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Delivery address</dt>
                <dd className="text-ink">{selectedAddressText}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Payment</dt>
                <dd className="text-ink">{methods.find((method) => method.id === values.paymentMethod)?.label}</dd>
              </div>
            </dl>
          )}

          {step === 3 && (
            <p className="rounded-lg border border-gold bg-blush p-3 text-sm text-ink" role="note">
              <strong>Delivery fee: to be confirmed</strong> — we&apos;ll contact you with the final total.
            </p>
          )}

          {serverErrors.length > 0 && (
            <div role="alert" className="rounded-lg border border-rose-dark bg-blush p-3 text-sm text-ink">
              <ul className="list-disc pl-5">
                {serverErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              <p className="mt-1">Your cart has been updated with today&apos;s prices and stock.</p>
            </div>
          )}

          <div className="flex flex-wrap-reverse items-center justify-between gap-3 pt-2">
            {step > 0 ? (
              <Button type="button" variant="ghost" size="lg" onClick={() => setStep((current) => current - 1)}>
                Back
              </Button>
            ) : (
              <Link href="/cart" className="text-sm underline">
                Back to cart
              </Link>
            )}
            <Button type="submit" size="lg" variant={step === 3 ? "rose" : "ink"} disabled={pending} className="min-w-40">
              {step < 3 ? "Continue" : pending ? "Placing order…" : "Place order"}
            </Button>
          </div>
        </form>
      </div>

      <aside aria-label="Order summary" className="rounded-2xl bg-white p-4 sm:p-6">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Your order</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {lines.map((line) => (
            <li key={line.sku} className="flex justify-between gap-3">
              <span className="text-ink">
                {line.qty} × {line.name} <span className="text-muted">({line.variantLabel})</span>
              </span>
              <span className="shrink-0 text-ink">{formatNaira(lineTotalKobo(line))}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-1 border-t border-blush-deep pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="font-medium">{formatNaira(subtotalKobo)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Delivery fee</dt>
            <dd className="text-right">To be confirmed</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">{deliveryNote}</p>
      </aside>
    </div>
  );
}
