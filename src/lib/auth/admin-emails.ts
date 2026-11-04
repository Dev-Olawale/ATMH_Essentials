/** Parses ADMIN_EMAILS ("a@x.com, B@y.com") into a lowercase set. Blank or missing = nobody. */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  );
}

export function isAdminEmail(email: string | null | undefined, raw = process.env.ADMIN_EMAILS) {
  if (!email) return false;
  return parseAdminEmails(raw).has(email.trim().toLowerCase());
}
