import { describe, expect, it } from "vitest";

import { formatNaira } from "@/lib/format";
import { whatsappOrderHref } from "@/lib/whatsapp";

describe("whatsappOrderHref", () => {
  it("pre-fills the name, variant and quantity, safely encoded", () => {
    const url = new URL(whatsappOrderHref("234 811 633 6407", "Dark & Lovely Cream", "250ml", 2));
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/2348116336407");
    expect(url.searchParams.get("text")).toContain("2 x Dark & Lovely Cream (250ml)");
  });
});

describe("formatNaira", () => {
  it("formats kobo as naira", () => {
    expect(formatNaira(1_250_000)).toBe("₦12,500");
    expect(formatNaira(0)).toBe("₦0");
    expect(formatNaira(1_250_050)).toBe("₦12,500.50");
  });
});
