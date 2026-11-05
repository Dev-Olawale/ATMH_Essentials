/** The 36 states and the Federal Capital Territory, for address and pay-on-delivery settings. */
export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];

export function isNigerianState(value: string): value is NigerianState {
  return (NIGERIAN_STATES as readonly string[]).includes(value);
}

/**
 * Turns a phone number as typed into digits with the country code, e.g. "0811 633 6407",
 * "+234 811 633 6407" and "2348116336407" all become "2348116336407".
 * Other countries' numbers are accepted with their "+" code. Returns null if it isn't a phone number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!/^[+(\d][\d\s().-]*$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  // Nigerian local format: 0 + 10 digits (e.g. 0803..., 0811...).
  if (/^0[789]\d{9}$/.test(digits)) return `234${digits.slice(1)}`;
  // Nigerian with country code, with or without "+".
  if (/^234[789]\d{9}$/.test(digits)) return digits;
  // Nigerian mobile typed without the leading 0.
  if (/^[789]\d{9}$/.test(digits) && !trimmed.startsWith("+")) return `234${digits}`;
  // Anything else must be an international number written with "+".
  if (trimmed.startsWith("+") && /^[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}

/** True when two typed phone numbers are the same number. */
export function phonesMatch(a: string, b: string): boolean {
  const left = normalizePhone(a);
  return left !== null && left === normalizePhone(b);
}
