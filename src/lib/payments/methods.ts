/**
 * Payment methods. Bank transfer and pay on delivery are manual: the order waits for a delivery
 * quote first. An online provider (e.g. Paystack) can be added later by giving it `online: true`
 * and handling its webhook; checkout only ever offers methods enabled in store settings.
 */
export type PaymentMethodId = "BANK_TRANSFER" | "PAY_ON_DELIVERY" | "PAYSTACK";

export type PaymentMethodInfo = {
  id: PaymentMethodId;
  label: string;
  description: string;
  /** Online providers take payment at checkout; manual ones after the delivery fee is agreed. */
  online: boolean;
  /** Not ready to be switched on in settings yet. */
  comingSoon?: boolean;
};

export const PAYMENT_METHODS: Record<PaymentMethodId, PaymentMethodInfo> = {
  BANK_TRANSFER: {
    id: "BANK_TRANSFER",
    label: "Bank transfer",
    description: "We'll send our bank details with your final total once the delivery fee is confirmed.",
    online: false,
  },
  PAY_ON_DELIVERY: {
    id: "PAY_ON_DELIVERY",
    label: "Pay on delivery",
    description: "Pay the rider by cash or transfer when your order arrives.",
    online: false,
  },
  PAYSTACK: {
    id: "PAYSTACK",
    label: "Card or bank (Paystack)",
    description: "Pay online securely.",
    online: true,
    comingSoon: true,
  },
};

export type PaymentRules = { enabledPaymentMethods: PaymentMethodId[]; podStates: string[] };

/** The methods a shopper may choose for a delivery state, in display order. */
export function availablePaymentMethods(rules: PaymentRules, state: string): PaymentMethodInfo[] {
  return (["BANK_TRANSFER", "PAY_ON_DELIVERY", "PAYSTACK"] as const)
    .filter((id) => rules.enabledPaymentMethods.includes(id) && !PAYMENT_METHODS[id].comingSoon)
    .filter((id) => id !== "PAY_ON_DELIVERY" || rules.podStates.includes(state))
    .map((id) => PAYMENT_METHODS[id]);
}
