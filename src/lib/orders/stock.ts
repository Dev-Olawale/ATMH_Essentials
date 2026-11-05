/** The part of a Prisma transaction these helpers need, so tests can pass a fake. */
export type StockTx = {
  productVariant: {
    updateMany(args: {
      where: { id: string; stockQty?: { gte: number }; product?: { active: boolean } };
      data: { stockQty: { decrement: number } | { increment: number } };
    }): Promise<{ count: number }>;
  };
};

export class OutOfStockError extends Error {
  constructor(readonly sku: string) {
    super(`Not enough stock for ${sku}.`);
    this.name = "OutOfStockError";
  }
}

/**
 * Takes the ordered quantities out of stock. Each update only succeeds if enough stock is left
 * at that moment, so two shoppers can't both buy the last item. Throws (rolling back the whole
 * transaction) if any line can't be reserved.
 */
export async function reserveStock(
  tx: StockTx,
  lines: { variantId: string; sku: string; quantity: number }[],
): Promise<void> {
  for (const line of lines) {
    const { count } = await tx.productVariant.updateMany({
      where: { id: line.variantId, stockQty: { gte: line.quantity }, product: { active: true } },
      data: { stockQty: { decrement: line.quantity } },
    });
    if (count !== 1) throw new OutOfStockError(line.sku);
  }
}

/** Puts a cancelled order's items back in stock. Items whose option was deleted are skipped. */
export async function restoreStock(
  tx: StockTx,
  items: { variantId: string | null; quantity: number }[],
): Promise<void> {
  for (const item of items) {
    if (!item.variantId) continue;
    await tx.productVariant.updateMany({
      where: { id: item.variantId },
      data: { stockQty: { increment: item.quantity } },
    });
  }
}
