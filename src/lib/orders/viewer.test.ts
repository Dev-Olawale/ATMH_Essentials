import { beforeEach, describe, expect, it, vi } from "vitest";

const orders = [
  { id: "o1", number: 10001, customerId: "customer-a", accessKey: "key-for-10001-xxxxxxxxxxxxxxxx", phone: "08031234567" },
  { id: "o2", number: 10002, customerId: null, accessKey: "key-for-10002-xxxxxxxxxxxxxxxx", phone: "08116336407" },
];
let signedIn: { id: string; email: string } | null = null;

vi.mock("@/lib/db", () => ({
  prisma: {
    order: {
      findUnique: async ({ where }: { where: { number: number } }) => orders.find((o) => o.number === where.number) ?? null,
    },
  },
}));
vi.mock("@/lib/auth/customer", () => ({ getCustomerUser: async () => signedIn }));

const { loadOrderForViewer } = await import("@/lib/orders/viewer");

beforeEach(() => {
  signedIn = null;
});

describe("loadOrderForViewer", () => {
  it("shows a customer their own order", async () => {
    signedIn = { id: "customer-a", email: "a@x.ng" };
    expect((await loadOrderForViewer("ATMH-10001", null))?.viewerIsOwner).toBe(true);
  });

  it("hides one customer's order from another signed-in customer", async () => {
    signedIn = { id: "customer-b", email: "b@x.ng" };
    expect(await loadOrderForViewer("ATMH-10001", null)).toBeNull();
    expect(await loadOrderForViewer("ATMH-10001", "wrong-key")).toBeNull();
  });

  it("shows a guest order to whoever holds its link, and to nobody else", async () => {
    expect(await loadOrderForViewer("ATMH-10002", orders[1].accessKey)).not.toBeNull();
    expect(await loadOrderForViewer("ATMH-10002", null)).toBeNull();
    expect(await loadOrderForViewer("ATMH-10002", orders[0].accessKey)).toBeNull(); // another order's key
    signedIn = { id: "customer-a", email: "a@x.ng" };
    expect(await loadOrderForViewer("ATMH-10002", null)).toBeNull();
  });

  it("treats junk order numbers as not found", async () => {
    expect(await loadOrderForViewer("../../etc", "x")).toBeNull();
    expect(await loadOrderForViewer("ATMH-99999", orders[0].accessKey)).toBeNull();
  });
});
