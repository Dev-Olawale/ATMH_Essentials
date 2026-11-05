/** wa.me link for the store's WhatsApp number (digits with country code, from store settings). */
export function whatsappHref(phoneDigits: string): string {
  return `https://wa.me/${phoneDigits.replace(/\D/g, "")}`;
}

export function whatsappOrderMessage(name: string, variantLabel: string, qty: number): string {
  return `Hello ATMH Essentials, I would like to order:\n${qty} x ${name} (${variantLabel})`;
}

export function whatsappOrderHref(phoneDigits: string, name: string, variantLabel: string, qty: number): string {
  return `${whatsappHref(phoneDigits)}?text=${encodeURIComponent(whatsappOrderMessage(name, variantLabel, qty))}`;
}
