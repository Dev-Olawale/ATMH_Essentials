import { beforeEach, describe, expect, it, vi } from "vitest";

const order = { number: 10007, phone: "0811 633 6407", accessKey: "secret-key-123" };
let allowed = true;

vi.mock("@/lib/db", () => ({
  prisma: { order: { findUnique: async ({ where }: { where: { number: number } }) => (where.number === order.number ? order : null) } },
}));
vi.mock("@/lib/rate-limit", () => ({ clientIp: async () => "1.2.3.4", rateLimit: async () => allowed }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { trackOrder } = await import("@/app/(store)/track/actions");
const form = (number: string, phone: string) => {
  const data = new FormData();
  data.set("number", number);
  data.set("phone", phone);
  return data;
};

beforeEach(() => {
  allowed = true;
});

describe("trackOrder (guest tracking)", () => {
  it("opens the order when the phone matches, however it's written", async () => {
    await expect(trackOrder({}, form("ATMH-10007", "+234 811 633 6407"))).rejects.toThrow(
      "REDIRECT /order/ATMH-10007?key=secret-key-123",
    );
  });

  it("refuses a wrong phone number without revealing the order exists", async () => {
    const wrongPhone = await trackOrder({}, form("ATMH-10007", "08031234567"));
    const noOrder = await trackOrder({}, form("ATMH-10008", "08116336407"));
    expect(wrongPhone.error).toBeDefined();
    expect(wrongPhone).toEqual(noOrder);
  });

  it("requires both fields", async () => {
    expect((await trackOrder({}, form("", "08116336407"))).error).toMatch(/order number/);
    expect((await trackOrder({}, form("ATMH-10007", ""))).error).toMatch(/order number/);
  });

  it("stops repeated guessing", async () => {
    allowed = false;
    expect((await trackOrder({}, form("ATMH-10007", "08116336407"))).error).toMatch(/Too many attempts/);
  });
});
