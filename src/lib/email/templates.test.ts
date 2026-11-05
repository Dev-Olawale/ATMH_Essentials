import { describe, expect, it } from "vitest";

import { renderAdminInvite, renderOrderEmail, type OrderEmailData, type OrderEmailKind } from "@/lib/email/templates";

const data: OrderEmailData = {
  number: 10023,
  customerName: "Ada <script>alert(1)</script> Obi",
  paymentMethod: "BANK_TRANSFER",
  subtotalKobo: 1_250_000,
  deliveryFeeKobo: 250_000,
  totalKobo: 1_500_000,
  state: "Lagos",
  city: "Ikeja",
  street: "12 Allen Avenue",
  landmark: "Opposite the bank",
  items: [{ productName: "Ariel & Co", variantLabel: "2kg", quantity: 2, unitPriceKobo: 625_000 }],
  link: "https://shop.example/order/ATMH-10023?key=abc",
  whatsappNumber: "2348116336407",
  bank: { bankName: "GTBank", accountName: "ATMH Essentials", accountNumber: "0123456789" },
};

const kinds: OrderEmailKind[] = [
  "order-received",
  "total-confirmed",
  "payment-confirmed",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "admin-new-order",
  "admin-payment-proof",
];

describe("renderOrderEmail", () => {
  it.each(kinds)("%s has a subject, HTML and a plain-text version with the order number", (kind) => {
    const email = renderOrderEmail(kind, data);
    expect(email.subject).toContain("ATMH-10023");
    expect(email.html).toMatch(/^<!doctype html>/);
    // No markup from the template in the plain-text part (customer text appears as typed).
    expect(email.text).not.toMatch(/<(p|table|tr|td|a|div|h1|br|strong)\b/i);
    expect(email.text.length).toBeGreaterThan(40);
  });

  it.each(kinds)("%s escapes customer-supplied text", (kind) => {
    const email = renderOrderEmail(kind, data);
    expect(email.html).not.toContain("<script>");
  });

  it("includes bank details and the amount only in the bank-transfer final total", () => {
    const total = renderOrderEmail("total-confirmed", data);
    expect(total.text).toContain("0123456789");
    expect(total.text).toContain("₦15,000");
    for (const kind of kinds.filter((k) => k !== "total-confirmed")) {
      expect(renderOrderEmail(kind, data).text, kind).not.toContain("0123456789");
    }
    const pod = renderOrderEmail("total-confirmed", { ...data, paymentMethod: "PAY_ON_DELIVERY" });
    expect(pod.text).not.toContain("0123456789");
    expect(pod.text).toContain("when your order arrives");
  });

  it("tells the customer to wait when bank details aren't set yet", () => {
    const email = renderOrderEmail("total-confirmed", { ...data, bank: null });
    expect(email.text).toContain("don't pay until you have them");
  });

  it("shows the delivery fee as pending before it is confirmed", () => {
    const email = renderOrderEmail("order-received", { ...data, deliveryFeeKobo: null, totalKobo: null });
    expect(email.text).toContain("Delivery fee: To be confirmed");
    expect(email.text).not.toContain("Total:");
  });
});

describe("renderAdminInvite", () => {
  it("links to the admin sign-in", () => {
    const email = renderAdminInvite({ role: "STAFF", invitedBy: "owner@atmh.ng", loginUrl: "https://shop.example/admin/login" });
    expect(email.text).toContain("https://shop.example/admin/login");
    expect(email.text).toContain("staff member");
  });
});
