import { describe, expect, it } from "vitest";

import { formatNaira } from "@/lib/format";
import { koboToNairaInput, MAX_PRICE_KOBO, nairaToKobo } from "@/lib/money";

describe("nairaToKobo", () => {
  it.each([
    ["12500", 1_250_000],
    ["12,500", 1_250_000],
    ["₦12,500", 1_250_000],
    ["₦ 12,500.50", 1_250_050],
    ["12500.5", 1_250_050],
    [" 0.99 ", 99],
    ["0", 0],
    // 0.1 + 0.2 style float errors must not creep in.
    ["19.99", 1_999],
    ["1234567.89", 123_456_789],
  ])("reads %j as %i kobo", (input, kobo) => {
    expect(nairaToKobo(input)).toBe(kobo);
  });

  it.each(["", "  ", "-500", "abc", "12.345", "1.2.3", "12,5OO", "1e5", "NaN", "Infinity"])(
    "rejects %j",
    (input) => {
      expect(nairaToKobo(input)).toBeNull();
    },
  );

  it("rejects amounts above the maximum", () => {
    expect(nairaToKobo(String(MAX_PRICE_KOBO / 100))).toBe(MAX_PRICE_KOBO);
    expect(nairaToKobo(String(MAX_PRICE_KOBO / 100 + 1))).toBeNull();
  });
});

describe("koboToNairaInput", () => {
  it("drops .00 and keeps two decimals otherwise", () => {
    expect(koboToNairaInput(1_250_000)).toBe("12500");
    expect(koboToNairaInput(1_250_050)).toBe("12500.50");
    expect(koboToNairaInput(5)).toBe("0.05");
    expect(koboToNairaInput(0)).toBe("0");
  });

  it("round-trips through nairaToKobo for every kobo value in a range", () => {
    for (let kobo = 0; kobo < 20_000; kobo += 7) {
      expect(nairaToKobo(koboToNairaInput(kobo))).toBe(kobo);
    }
  });

  it("matches the storefront display", () => {
    expect(formatNaira(nairaToKobo("12,500")!)).toBe("₦12,500");
  });
});
