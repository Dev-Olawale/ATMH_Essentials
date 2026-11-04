/** Largest price the admin accepts: ₦100,000,000 (keeps kobo well inside a 32-bit integer). */
export const MAX_PRICE_KOBO = 100_000_000 * 100;

/**
 * Converts what the owner types into kobo, without floating-point rounding.
 * Accepts "12500", "12,500", "₦12,500.50", "12500.5". Returns null for anything else:
 * blanks, negatives, letters, more than two decimal places, or amounts over the maximum.
 */
export function nairaToKobo(input: string): number | null {
  const cleaned = input.trim().replace(/^₦\s*/, "").replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const kobo = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(kobo) && kobo <= MAX_PRICE_KOBO ? kobo : null;
}

/** Kobo to the plain number shown in a price field: 1250000 -> "12500", 1250050 -> "12500.50". */
export function koboToNairaInput(kobo: number): string {
  const naira = Math.trunc(kobo / 100);
  const rest = kobo % 100;
  return rest === 0 ? String(naira) : `${naira}.${String(rest).padStart(2, "0")}`;
}
