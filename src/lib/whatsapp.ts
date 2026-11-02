import { whatsappHref } from "@/config/site";

export function whatsappOrderMessage(name: string, variantLabel: string, qty: number): string {
  return `Hello ATMH Essentials, I would like to order:\n${qty} x ${name} (${variantLabel})`;
}

export function whatsappOrderHref(name: string, variantLabel: string, qty: number): string {
  return `${whatsappHref}?text=${encodeURIComponent(whatsappOrderMessage(name, variantLabel, qty))}`;
}
