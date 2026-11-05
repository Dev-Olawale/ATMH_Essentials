/**
 * Every admin Server Action and Route Handler must refuse signed-out visitors and customers,
 * and staff must be refused owner-only actions, before any input is read or data touched.
 * New actions added to these modules are picked up automatically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAccessError } from "@/lib/auth/admin";

type Who = "signed-out" | "customer" | "STAFF" | "OWNER";
let who: Who = "signed-out";
const touched: string[] = [];

// Any use of the database, storage, cache or redirects counts as "got past the guard".
// Async APIs (database, storage, headers) fail the way the real ones do: with a rejected promise.
class Tripwire extends Error {}
function tripwire(name: string, async = false): unknown {
  return new Proxy(() => {}, {
    get: (_target, property) => (property === "then" ? undefined : tripwire(`${name}.${String(property)}`, async)),
    apply: () => {
      touched.push(name);
      const error = new Tripwire(`${name} was called`);
      if (async) return Promise.reject(error);
      throw error;
    },
  });
}

vi.mock("@/lib/auth/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/admin")>();
  const guard = async (role?: "OWNER") => {
    if (who === "signed-out") throw new actual.AdminAccessError("signed-out");
    if (who === "customer") throw new actual.AdminAccessError("not-allowed");
    if (role === "OWNER" && who !== "OWNER") throw new actual.AdminAccessError("owner-only");
    return { id: "admin-1", email: "admin@atmh.ng", role: who };
  };
  return { ...actual, requireAdmin: vi.fn(guard), requireAdminPage: vi.fn(guard) };
});
vi.mock("@/lib/db", () => ({ prisma: tripwire("prisma", true) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: tripwire("supabaseAdmin") }));
vi.mock("next/cache", () => ({
  updateTag: tripwire("updateTag"),
  revalidateTag: tripwire("revalidateTag"),
  revalidatePath: tripwire("revalidatePath"),
}));
vi.mock("next/navigation", () => ({ redirect: tripwire("redirect"), notFound: tripwire("notFound") }));
vi.mock("next/headers", () => ({ headers: tripwire("headers", true), cookies: tripwire("cookies", true) }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: tripwire("after"),
}));

const actionModules = {
  products: await import("@/app/admin/actions/products"),
  images: await import("@/app/admin/actions/images"),
  categories: await import("@/app/admin/actions/categories"),
  import: await import("@/app/admin/actions/import"),
  "sample-data": await import("@/app/admin/actions/sample-data"),
  orders: await import("@/app/admin/actions/orders"),
  settings: await import("@/app/admin/actions/settings"),
  team: await import("@/app/admin/actions/team"),
};
const imagesRoute = await import("@/app/admin/api/products/[id]/images/route");
const exportRoute = await import("@/app/admin/api/products/export/route");
const proofRoute = await import("@/app/admin/api/orders/[id]/proofs/[proofId]/route");

function formData(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}
const anyForm = () =>
  formData({
    id: "p1",
    name: "Test",
    slug: "test",
    confirm: "REMOVE",
    email: "new@atmh.ng",
    role: "STAFF",
    whatsappNumber: "08116336407",
    enabledPaymentMethods: "BANK_TRANSFER",
    announcement: "Hi",
    deliveryNote: "Note",
    variants: JSON.stringify([{ label: "1", sku: "T-1", price: "100", compareAt: "", stock: "1", lowStockThreshold: "1" }]),
  });

/** Plausible arguments, so a missing guard would reach the database rather than fail on input. */
const argsFor: Record<string, () => unknown[]> = {
  saveProduct: () => [{ status: "idle" }, anyForm()],
  setProductActive: () => ["p1", false],
  updateVariantStock: () => ["v1", 5],
  updateImageAlt: () => ["i1", "alt"],
  moveImage: () => ["i1", "up"],
  deleteImage: () => ["i1"],
  saveCategory: () => [{ status: "idle" }, anyForm()],
  moveCategory: () => ["c1", "up"],
  setCategoryFlag: () => ["c1", "active", false],
  previewProductImport: () => ["product_slug\nx"],
  applyProductImport: () => ["product_slug\nx"],
  removeSampleData: () => [{ status: "idle" }, anyForm()],
  setDeliveryFee: () => ["o1", "2500"],
  markPaid: () => ["o1"],
  markPacked: () => ["o1"],
  dispatchOrder: () => ["o1", { riderName: "Rider", riderPhone: "08031234567", note: "" }],
  markDelivered: () => ["o1"],
  cancelOrder: () => ["o1", "Customer asked"],
  saveSettings: () => [{ status: "idle" }, anyForm()],
  inviteAdmin: () => [{ status: "idle" }, anyForm()],
  changeAdminRole: () => ["a2", "OWNER"],
  removeAdmin: () => ["a2"],
};

/** Owner only: team, settings and sample data. Everything else is open to staff. */
const OWNER_ONLY = new Set(["saveSettings", "inviteAdmin", "changeAdminRole", "removeAdmin", "removeSampleData"]);

const actions = Object.entries(actionModules).flatMap(([file, module]) =>
  Object.entries(module)
    .filter(([, value]) => typeof value === "function")
    .map(([name, fn]) => ({ label: `${file}.${name}`, name, fn: fn as (...args: unknown[]) => Promise<unknown> })),
);

const routes = [
  {
    label: "photo upload",
    call: () => {
      const body = new FormData();
      body.set("file", new File([new Uint8Array(10)], "a.webp", { type: "image/webp" }));
      return imagesRoute.POST(new Request("http://x/admin/api/products/p1/images", { method: "POST", body }) as never, {
        params: Promise.resolve({ id: "p1" }),
      });
    },
  },
  { label: "CSV export", call: () => exportRoute.GET() },
  {
    label: "payment proof viewer",
    call: () => proofRoute.GET(new Request("http://x"), { params: Promise.resolve({ id: "o1", proofId: "f1" }) }),
  },
];

beforeEach(() => {
  touched.length = 0;
});

it("covers every exported admin action", () => {
  expect(actions.map((action) => action.name).sort()).toEqual(Object.keys(argsFor).sort());
});

describe.each([
  ["signed out", "signed-out" as const, 401],
  ["a signed-in customer", "customer" as const, 403],
])("as %s", (_label, role, status) => {
  beforeEach(() => {
    who = role;
  });
  afterEach(() => {
    expect(touched).toEqual([]);
  });

  it.each(actions)("$label is refused", async ({ name, fn }) => {
    await expect(fn(...argsFor[name]())).rejects.toBeInstanceOf(AdminAccessError);
  });

  it.each(routes)("$label is refused", async ({ call }) => {
    expect((await call()).status).toBe(status);
  });
});

describe("as staff", () => {
  beforeEach(() => {
    who = "STAFF";
  });

  it.each(actions.filter((action) => OWNER_ONLY.has(action.name)))("$label is owner-only", async ({ name, fn }) => {
    await expect(fn(...argsFor[name]())).rejects.toMatchObject({ reason: "owner-only" });
    expect(touched).toEqual([]);
  });

  it.each(actions.filter((action) => !OWNER_ONLY.has(action.name)))("$label lets staff through", async ({ name, fn }) => {
    // Past the guard, the action reaches a (fake) dependency instead of being refused.
    await expect(fn(...argsFor[name]())).rejects.toBeInstanceOf(Tripwire);
  });

  it.each(routes)("$label lets staff through", async ({ call }) => {
    await expect(call()).rejects.toBeInstanceOf(Tripwire);
  });
});

describe("as an owner", () => {
  beforeEach(() => {
    who = "OWNER";
  });

  it.each(actions.filter((action) => OWNER_ONLY.has(action.name)))("$label is allowed", async ({ name, fn }) => {
    await expect(fn(...argsFor[name]())).rejects.toBeInstanceOf(Tripwire);
  });
});
