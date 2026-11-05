import { describe, expect, it } from "vitest";

import { availablePaymentMethods } from "@/lib/payments/methods";

const ids = (rules: Parameters<typeof availablePaymentMethods>[0], state: string) =>
  availablePaymentMethods(rules, state).map((method) => method.id);

describe("availablePaymentMethods", () => {
  const defaults = { enabledPaymentMethods: ["BANK_TRANSFER", "PAY_ON_DELIVERY"] as const, podStates: ["Lagos"] };

  it("offers pay on delivery in Lagos by default, and bank transfer everywhere", () => {
    expect(ids({ ...defaults, enabledPaymentMethods: [...defaults.enabledPaymentMethods] }, "Lagos")).toEqual([
      "BANK_TRANSFER",
      "PAY_ON_DELIVERY",
    ]);
    expect(ids({ ...defaults, enabledPaymentMethods: [...defaults.enabledPaymentMethods] }, "Kano")).toEqual(["BANK_TRANSFER"]);
  });

  it("follows the owner's settings", () => {
    expect(ids({ enabledPaymentMethods: ["PAY_ON_DELIVERY"], podStates: ["Ogun", "Lagos"] }, "Ogun")).toEqual(["PAY_ON_DELIVERY"]);
    expect(ids({ enabledPaymentMethods: ["BANK_TRANSFER"], podStates: ["Lagos"] }, "Lagos")).toEqual(["BANK_TRANSFER"]);
  });

  it("never offers Paystack until it is built, even if switched on", () => {
    expect(ids({ enabledPaymentMethods: ["PAYSTACK", "BANK_TRANSFER"], podStates: [] }, "Lagos")).toEqual(["BANK_TRANSFER"]);
  });
});
