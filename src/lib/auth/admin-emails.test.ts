import { describe, expect, it } from "vitest";

import { isAdminEmail, parseAdminEmails } from "@/lib/auth/admin-emails";

describe("parseAdminEmails", () => {
  it("trims, lowercases and drops blanks", () => {
    expect([...parseAdminEmails(" Owner@ATMH.ng ,staff@atmh.ng,, ,not-an-email")]).toEqual([
      "owner@atmh.ng",
      "staff@atmh.ng",
    ]);
  });

  it("means nobody when unset or empty", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("").size).toBe(0);
  });
});

describe("isAdminEmail", () => {
  const list = "owner@atmh.ng,staff@atmh.ng";

  it("accepts listed emails regardless of case or spaces", () => {
    expect(isAdminEmail("OWNER@atmh.ng", list)).toBe(true);
    expect(isAdminEmail(" staff@atmh.ng ", list)).toBe(true);
  });

  it("rejects everyone else, including look-alikes", () => {
    for (const email of [
      "someone@atmh.ng",
      "owner@atmh.ng.evil.com",
      "evil-owner@atmh.ng",
      "owner@atmh.n",
      "",
      null,
      undefined,
    ]) {
      expect(isAdminEmail(email, list), String(email)).toBe(false);
    }
  });

  it("rejects everyone when ADMIN_EMAILS is not set", () => {
    expect(isAdminEmail("owner@atmh.ng", undefined)).toBe(false);
  });
});
