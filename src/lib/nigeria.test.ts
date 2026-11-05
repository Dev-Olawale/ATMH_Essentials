import { describe, expect, it } from "vitest";

import { NIGERIAN_STATES, normalizePhone, phonesMatch } from "@/lib/nigeria";

describe("NIGERIAN_STATES", () => {
  it("lists all 36 states plus the FCT, once each", () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
    expect(new Set(NIGERIAN_STATES).size).toBe(37);
    expect(NIGERIAN_STATES).toContain("Lagos");
    expect(NIGERIAN_STATES).toContain("FCT (Abuja)");
  });
});

describe("normalizePhone", () => {
  it.each([
    ["08116336407", "2348116336407"],
    ["0811 633 6407", "2348116336407"],
    ["+234 811 633 6407", "2348116336407"],
    ["2348116336407", "2348116336407"],
    ["(0703) 123-4567", "2347031234567"],
    ["8116336407", "2348116336407"],
    ["+44 20 7946 0958", "442079460958"],
  ])("reads %j as %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "hello", "0811633640", "081163364077", "12345", "0211 633 6407", "4420794609"])(
    "rejects %j",
    (input) => expect(normalizePhone(input)).toBeNull(),
  );
});

describe("phonesMatch", () => {
  it("matches the same number written differently", () => {
    expect(phonesMatch("0811 633 6407", "+2348116336407")).toBe(true);
  });

  it("does not match different or invalid numbers", () => {
    expect(phonesMatch("08116336407", "08116336408")).toBe(false);
    expect(phonesMatch("nonsense", "nonsense")).toBe(false);
  });
});
