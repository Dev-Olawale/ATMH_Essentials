/** Formats an integer kobo amount for display, e.g. 1250000 -> "₦12,500". */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  const formatted = naira.toLocaleString("en-NG", {
    minimumFractionDigits: Number.isInteger(naira) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `₦${formatted}`;
}
