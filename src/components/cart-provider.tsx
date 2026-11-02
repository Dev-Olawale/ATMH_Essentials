"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// In-memory item count only, so the header badge responds. The real cart comes in a later step.
const CartContext = createContext<{ count: number; addItem: () => void } | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const addItem = useCallback(() => setCount((current) => current + 1), []);
  const value = useMemo(() => ({ count, addItem }), [count, addItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return cart;
}
