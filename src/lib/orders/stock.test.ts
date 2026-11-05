import { describe, expect, it } from "vitest";

import { OutOfStockError, reserveStock, restoreStock, type StockTx } from "@/lib/orders/stock";

/** An in-memory stand-in for a transaction, with the same conditional-update semantics. */
function fakeDb(stock: Record<string, { qty: number; active?: boolean }>) {
  const rows = structuredClone(stock);
  let snapshot = structuredClone(rows);
  const tx: StockTx = {
    productVariant: {
      async updateMany({ where, data }) {
        const row = rows[where.id];
        if (!row) return { count: 0 };
        if (where.stockQty && row.qty < where.stockQty.gte) return { count: 0 };
        if (where.product?.active && row.active === false) return { count: 0 };
        row.qty += "increment" in data.stockQty ? data.stockQty.increment : -data.stockQty.decrement;
        return { count: 1 };
      },
    },
  };
  // Mimics $transaction: all or nothing.
  async function transaction(work: (tx: StockTx) => Promise<void>) {
    snapshot = structuredClone(rows);
    try {
      await work(tx);
    } catch (error) {
      Object.assign(rows, structuredClone(snapshot));
      throw error;
    }
  }
  return { rows, transaction };
}

describe("reserveStock", () => {
  it("takes the ordered quantities out of stock", async () => {
    const db = fakeDb({ a: { qty: 5 }, b: { qty: 2 } });
    await db.transaction((tx) =>
      reserveStock(tx, [
        { variantId: "a", sku: "A", quantity: 3 },
        { variantId: "b", sku: "B", quantity: 2 },
      ]),
    );
    expect(db.rows).toEqual({ a: { qty: 2 }, b: { qty: 0 } });
  });

  it("refuses the whole order if one line is short, leaving stock untouched", async () => {
    const db = fakeDb({ a: { qty: 5 }, b: { qty: 1 } });
    await expect(
      db.transaction((tx) =>
        reserveStock(tx, [
          { variantId: "a", sku: "A", quantity: 3 },
          { variantId: "b", sku: "B", quantity: 2 },
        ]),
      ),
    ).rejects.toEqual(new OutOfStockError("B"));
    expect(db.rows).toEqual({ a: { qty: 5 }, b: { qty: 1 } });
  });

  it("never sells the last item twice", async () => {
    const db = fakeDb({ a: { qty: 1 } });
    await db.transaction((tx) => reserveStock(tx, [{ variantId: "a", sku: "A", quantity: 1 }]));
    await expect(
      db.transaction((tx) => reserveStock(tx, [{ variantId: "a", sku: "A", quantity: 1 }])),
    ).rejects.toBeInstanceOf(OutOfStockError);
    expect(db.rows.a.qty).toBe(0);
  });

  it("refuses archived products", async () => {
    const db = fakeDb({ a: { qty: 5, active: false } });
    await expect(
      db.transaction((tx) => reserveStock(tx, [{ variantId: "a", sku: "A", quantity: 1 }])),
    ).rejects.toBeInstanceOf(OutOfStockError);
  });
});

describe("restoreStock", () => {
  it("puts a cancelled order back, skipping deleted options", async () => {
    const db = fakeDb({ a: { qty: 2 } });
    await db.transaction((tx) =>
      restoreStock(tx, [
        { variantId: "a", quantity: 3 },
        { variantId: null, quantity: 4 },
      ]),
    );
    expect(db.rows.a.qty).toBe(5);
  });

  it("reserve then restore returns to the starting stock", async () => {
    const db = fakeDb({ a: { qty: 7 } });
    await db.transaction((tx) => reserveStock(tx, [{ variantId: "a", sku: "A", quantity: 4 }]));
    await db.transaction((tx) => restoreStock(tx, [{ variantId: "a", quantity: 4 }]));
    expect(db.rows.a.qty).toBe(7);
  });
});
