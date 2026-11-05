import { describe, expect, it } from "vitest";

import {
  assertTransition,
  canSetDeliveryFee,
  canTransition,
  customerSteps,
  InvalidTransitionError,
  ORDER_STATUSES,
  parseOrderNumber,
  formatOrderNumber,
  statusAfterQuote,
  type OrderStatusId,
} from "@/lib/orders/status";

const bankPath: OrderStatusId[] = [
  "AWAITING_DELIVERY_QUOTE",
  "AWAITING_PAYMENT",
  "PAID",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
const podPath: OrderStatusId[] = ["AWAITING_DELIVERY_QUOTE", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

describe("order status transitions", () => {
  it("walks the bank-transfer path step by step", () => {
    for (let i = 0; i < bankPath.length - 1; i++) {
      expect(canTransition(bankPath[i], bankPath[i + 1], "BANK_TRANSFER"), bankPath[i]).toBe(true);
    }
  });

  it("walks the pay-on-delivery path step by step", () => {
    for (let i = 0; i < podPath.length - 1; i++) {
      expect(canTransition(podPath[i], podPath[i + 1], "PAY_ON_DELIVERY"), podPath[i]).toBe(true);
    }
  });

  it("sends the quote to the right next status for each payment method", () => {
    expect(statusAfterQuote("BANK_TRANSFER")).toBe("AWAITING_PAYMENT");
    expect(statusAfterQuote("PAY_ON_DELIVERY")).toBe("CONFIRMED");
    expect(canTransition("AWAITING_DELIVERY_QUOTE", "CONFIRMED", "BANK_TRANSFER")).toBe(false);
    expect(canTransition("AWAITING_DELIVERY_QUOTE", "AWAITING_PAYMENT", "PAY_ON_DELIVERY")).toBe(false);
  });

  it.each([
    ["AWAITING_DELIVERY_QUOTE", "PAID"],
    ["AWAITING_DELIVERY_QUOTE", "PACKED"],
    ["AWAITING_DELIVERY_QUOTE", "DELIVERED"],
    ["AWAITING_PAYMENT", "PACKED"],
    ["AWAITING_PAYMENT", "OUT_FOR_DELIVERY"],
    ["PAID", "AWAITING_PAYMENT"],
    ["PACKED", "PAID"],
    ["OUT_FOR_DELIVERY", "PACKED"],
    ["DELIVERED", "CANCELLED"],
    ["CANCELLED", "AWAITING_DELIVERY_QUOTE"],
    ["CANCELLED", "PAID"],
  ] as [OrderStatusId, OrderStatusId][])("rejects %s → %s", (from, to) => {
    expect(canTransition(from, to, "BANK_TRANSFER")).toBe(false);
    expect(() => assertTransition(from, to, "BANK_TRANSFER")).toThrow(InvalidTransitionError);
  });

  it("never marks a pay-on-delivery order as awaiting payment or paid", () => {
    for (const from of ORDER_STATUSES) {
      expect(canTransition(from, "PAID", "PAY_ON_DELIVERY")).toBe(false);
      expect(canTransition(from, "AWAITING_PAYMENT", "PAY_ON_DELIVERY")).toBe(false);
    }
  });

  it("lets every open order be cancelled and no closed order change", () => {
    for (const from of ORDER_STATUSES) {
      const open = from !== "DELIVERED" && from !== "CANCELLED";
      expect(canTransition(from, "CANCELLED", "BANK_TRANSFER"), from).toBe(open);
      if (!open) {
        for (const to of ORDER_STATUSES) expect(canTransition(from, to, "PAY_ON_DELIVERY")).toBe(false);
      }
    }
  });

  it("allows the delivery fee to change only before packing or payment", () => {
    expect(ORDER_STATUSES.filter(canSetDeliveryFee)).toEqual(["AWAITING_DELIVERY_QUOTE", "AWAITING_PAYMENT", "CONFIRMED"]);
  });

  it("shows shoppers the payment step only for bank transfer", () => {
    expect(customerSteps("BANK_TRANSFER").map((s) => s.status)).toEqual(bankPath);
    expect(customerSteps("PAY_ON_DELIVERY").map((s) => s.status)).toEqual(podPath);
  });
});

describe("order numbers", () => {
  it("formats and reads them back", () => {
    expect(formatOrderNumber(10023)).toBe("ATMH-10023");
    for (const input of ["ATMH-10023", "atmh 10023", "#10023", " 10023 "]) {
      expect(parseOrderNumber(input), input).toBe(10023);
    }
    expect(parseOrderNumber("ATMH-")).toBeNull();
    expect(parseOrderNumber("10023; drop table")).toBeNull();
  });
});
