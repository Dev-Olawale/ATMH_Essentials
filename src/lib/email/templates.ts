import { formatNaira } from "@/lib/format";
import { formatOrderNumber } from "@/lib/orders/status";
import { PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments/methods";
import type { BankDetails } from "@/lib/settings";

/**
 * Brand colours for email only: email clients can't read the site's CSS variables, so these
 * mirror the tokens in globals.css (CLAUDE.md §3). Change both together.
 */
const BRAND = { blush: "#FBF1EC", blushDeep: "#F3E1D8", rose: "#C4877F", gold: "#C8954A", ink: "#1A1A1A", muted: "#6B5E59" };

export type Email = { subject: string; html: string; text: string };

export type OrderEmailData = {
  number: number;
  customerName: string;
  paymentMethod: PaymentMethodId;
  subtotalKobo: number;
  deliveryFeeKobo: number | null;
  totalKobo: number | null;
  state: string;
  city: string;
  street: string;
  landmark: string;
  items: { productName: string; variantLabel: string; quantity: number; unitPriceKobo: number }[];
  /** Customer emails: the order link with its key. Admin emails: the admin order page. */
  link: string;
  whatsappNumber: string;
  bank?: BankDetails | null;
  riderName?: string | null;
  riderPhone?: string | null;
  dispatchNote?: string | null;
  cancelReason?: string | null;
  customerPhone?: string;
  customerEmail?: string;
};

export type OrderEmailKind =
  | "order-received"
  | "total-confirmed"
  | "payment-confirmed"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "admin-new-order"
  | "admin-payment-proof";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Block = { text: string; html: string };
const para = (text: string): Block => ({ text, html: `<p style="margin:0 0 16px">${escapeHtml(text)}</p>` });

function itemsBlock(data: OrderEmailData): Block {
  const rows = data.items.map((item) => ({
    left: `${item.quantity} x ${item.productName} (${item.variantLabel})`,
    right: formatNaira(item.unitPriceKobo * item.quantity),
  }));
  const totals = [
    { left: "Subtotal", right: formatNaira(data.subtotalKobo) },
    {
      left: "Delivery fee",
      right: data.deliveryFeeKobo === null ? "To be confirmed" : formatNaira(data.deliveryFeeKobo),
    },
    ...(data.totalKobo !== null ? [{ left: "Total", right: formatNaira(data.totalKobo), strong: true }] : []),
  ];
  const tr = (row: { left: string; right: string; strong?: boolean }) =>
    `<tr><td style="padding:6px 0;${row.strong ? "font-weight:600" : ""}">${escapeHtml(row.left)}</td>` +
    `<td style="padding:6px 0;text-align:right;${row.strong ? "font-weight:600" : ""}">${escapeHtml(row.right)}</td></tr>`;
  return {
    text: [...rows, ...totals].map((row) => `${row.left}: ${row.right}`).join("\n"),
    html:
      `<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 16px;font-size:14px">` +
      rows.map(tr).join("") +
      `<tr><td colspan="2" style="border-top:1px solid ${BRAND.blushDeep};padding:0"></td></tr>` +
      totals.map(tr).join("") +
      `</table>`,
  };
}

function bankBlock(data: OrderEmailData): Block {
  if (!data.bank) {
    return para("We'll send our bank details to you shortly. Please don't pay until you have them.");
  }
  const lines = [
    `Bank: ${data.bank.bankName}`,
    `Account name: ${data.bank.accountName}`,
    `Account number: ${data.bank.accountNumber}`,
    `Amount: ${data.totalKobo !== null ? formatNaira(data.totalKobo) : ""}`,
    `Reference: ${formatOrderNumber(data.number)}`,
  ];
  return {
    text: `Please pay by bank transfer:\n${lines.join("\n")}\nThen upload your receipt or the transfer reference on your order page.`,
    html:
      `<p style="margin:0 0 8px">Please pay by bank transfer:</p>` +
      `<div style="background:${BRAND.blushDeep};border-radius:12px;padding:16px;margin:0 0 16px;font-size:14px;line-height:1.7">` +
      lines.map((line) => escapeHtml(line)).join("<br>") +
      `</div><p style="margin:0 0 16px">Then upload your receipt or the transfer reference on your order page.</p>`,
  };
}

function addressBlock(data: OrderEmailData): Block {
  const lines = [data.street, data.landmark && `Landmark: ${data.landmark}`, `${data.city}, ${data.state}`].filter(Boolean);
  return {
    text: `Delivery address:\n${lines.join("\n")}`,
    html: `<p style="margin:0 0 16px;font-size:14px"><strong>Delivery address</strong><br>${lines.map((l) => escapeHtml(String(l))).join("<br>")}</p>`,
  };
}

function button(label: string, href: string): Block {
  return {
    text: `${label}: ${href}`,
    html:
      `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:${BRAND.ink};color:#FFFFFF;` +
      `text-decoration:none;padding:12px 24px;border-radius:999px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase">${escapeHtml(label)}</a></p>`,
  };
}

function layout(title: string, blocks: Block[]): { html: string; text: string } {
  const html =
    `<!doctype html><html><body style="margin:0;background:${BRAND.blush};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink}">` +
    `<table role="presentation" width="100%" style="background:${BRAND.blush}"><tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border-radius:16px">` +
    `<tr><td style="padding:24px 24px 0;text-align:center;font-family:Georgia,serif;font-size:22px;letter-spacing:0.08em">ATMH` +
    `<div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.4em;color:${BRAND.gold}">ESSENTIALS</div></td></tr>` +
    `<tr><td style="padding:16px 24px 0"><div style="height:1px;background:${BRAND.rose}"></div></td></tr>` +
    `<tr><td style="padding:24px;font-size:15px;line-height:1.5">` +
    `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px">${escapeHtml(title)}</h1>` +
    blocks.map((block) => block.html).join("") +
    `</td></tr><tr><td style="padding:0 24px 24px;font-size:12px;color:${BRAND.muted}">ATMH Essentials · Home. Beauty. Everyday Living.</td></tr>` +
    `</table></td></tr></table></body></html>`;
  const text = [title, "", ...blocks.map((block) => block.text), "", "ATMH Essentials"].join("\n\n");
  return { html, text };
}

export function renderOrderEmail(kind: OrderEmailKind, data: OrderEmailData): Email {
  const ref = formatOrderNumber(data.number);
  const first = data.customerName.trim().split(/\s+/)[0] || "there";
  const method = PAYMENT_METHODS[data.paymentMethod].label;
  const items = itemsBlock(data);
  const view = button("View your order", data.link);

  const build = (subject: string, title: string, blocks: Block[]): Email => ({ subject, ...layout(title, blocks) });

  switch (kind) {
    case "order-received":
      return build(`We've received your order ${ref}`, `Thank you, ${first}!`, [
        para(`We've received your order ${ref}. We're arranging delivery with our rider and will confirm your delivery fee and final total soon.`),
        items,
        para(`Payment: ${method}.`),
        addressBlock(data),
        view,
      ]);
    case "total-confirmed":
      return build(`Your final total for ${ref}`, "Your final total is ready", [
        para(`Hi ${first}, we've confirmed the delivery fee for your order ${ref}.`),
        items,
        ...(data.paymentMethod === "BANK_TRANSFER"
          ? [bankBlock(data)]
          : [para("Please have the total ready when your order arrives. You can pay the rider by cash or transfer.")]),
        view,
      ]);
    case "payment-confirmed":
      return build(`Payment received for ${ref}`, "Payment received", [
        para(`Hi ${first}, we've received your payment for order ${ref}. We're packing it now.`),
        items,
        view,
      ]);
    case "out-for-delivery":
      return build(`${ref} is on its way`, "Your order is on its way", [
        para(`Hi ${first}, your order ${ref} is out for delivery.`),
        ...(data.riderName ? [para(`Rider: ${data.riderName}${data.riderPhone ? `, ${data.riderPhone}` : ""}`)] : []),
        ...(data.dispatchNote ? [para(data.dispatchNote)] : []),
        ...(data.paymentMethod === "PAY_ON_DELIVERY" && data.totalKobo !== null
          ? [para(`Amount to pay on delivery: ${formatNaira(data.totalKobo)}.`)]
          : []),
        view,
      ]);
    case "delivered":
      return build(`${ref} has been delivered`, "Delivered!", [
        para(`Hi ${first}, your order ${ref} has been delivered. Thank you for shopping with ATMH Essentials.`),
        para("Running low on something? You can reorder from your order page in one tap."),
        view,
      ]);
    case "cancelled":
      return build(`${ref} has been cancelled`, "Your order has been cancelled", [
        para(`Hi ${first}, your order ${ref} has been cancelled.`),
        ...(data.cancelReason ? [para(`Reason: ${data.cancelReason}`)] : []),
        para("If you've already paid, we'll contact you about a refund. Questions? Reply to this email or message us on WhatsApp."),
        view,
      ]);
    case "admin-new-order":
      return build(`New order ${ref} – ${formatNaira(data.subtotalKobo)}`, `New order ${ref}`, [
        para(`${data.customerName} (${data.customerPhone ?? ""}, ${data.customerEmail ?? ""}) placed an order. Payment: ${method}.`),
        items,
        addressBlock(data),
        para("Next: agree the delivery fee with a rider and enter it on the order."),
        button("Open order", data.link),
      ]);
    case "admin-payment-proof":
      return build(`Payment proof for ${ref}`, `Payment proof for ${ref}`, [
        para(`${data.customerName} sent proof of payment for ${ref}${data.totalKobo !== null ? ` (${formatNaira(data.totalKobo)})` : ""}. Check your bank, then mark the order as paid.`),
        button("Review payment", data.link),
      ]);
  }
}

export function renderAdminInvite(data: { role: "OWNER" | "STAFF"; invitedBy: string; loginUrl: string }): Email {
  const role = data.role === "OWNER" ? "an owner" : "a staff member";
  return {
    subject: "You've been added to the ATMH Essentials admin",
    ...layout("Welcome to the ATMH admin", [
      para(`${data.invitedBy} added you as ${role} of the ATMH Essentials shop.`),
      para("Sign in with this email address. We'll email you a one-time link; there's no password."),
      button("Sign in to the admin", data.loginUrl),
    ]),
  };
}
