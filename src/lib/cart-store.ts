"use client";

import { useSyncExternalStore } from "react";

import {
  addLine,
  cartCount,
  cartSubtotalKobo,
  reconcileCart,
  removeLine,
  sanitizeLines,
  setLineQty,
  type CartLine,
  type FreshVariant,
} from "@/lib/cart";

const STORAGE_KEY = "atmh-cart-v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] | null = null;
let drawerOpen = false;
let notice: string | null = null;
let synced = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function readStorage(): CartLine[] {
  try {
    return sanitizeLines(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function getLines(): CartLine[] {
  lines ??= readStorage();
  return lines;
}

function commit(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the cart still works for this page view.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other open tabs in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      lines = readStorage();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, so the server and first client render match. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useCart() {
  const current = useSyncExternalStore(subscribe, getLines, () => EMPTY);
  return {
    lines: current,
    count: cartCount(current),
    subtotalKobo: cartSubtotalKobo(current),
    add: (line: CartLine, qty = 1) => commit(addLine(getLines(), line, qty)),
    setQty: (sku: string, qty: number) => commit(setLineQty(getLines(), sku, qty)),
    remove: (sku: string) => commit(removeLine(getLines(), sku)),
  };
}

/**
 * Checks the saved cart against the store once per page load, so prices, names and stock
 * are current. Network errors leave the cart as it is.
 */
export async function syncCart({ force = false } = {}) {
  if (synced && !force) return;
  synced = true;
  const saved = getLines();
  if (saved.length === 0) return;
  try {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus: saved.map((line) => line.sku) }),
    });
    if (!response.ok) return;
    const { items } = (await response.json()) as { items: FreshVariant[] };
    // The shopper may have changed the cart while the request was in flight.
    const result = reconcileCart(getLines(), new Map(items.map((item) => [item.sku, item])));
    if (result.removed.length > 0) {
      notice = `No longer available, so removed from your cart: ${result.removed.join(", ")}.`;
    } else if (result.changed) {
      notice = "Some prices or quantities in your cart have been updated.";
    }
    if (result.removed.length > 0 || result.changed) commit(result.lines);
  } catch {
    // Offline or the server is unreachable: keep the saved cart.
  }
}

export function useCartNotice() {
  return useSyncExternalStore(
    subscribe,
    () => notice,
    () => null,
  );
}

export function dismissCartNotice() {
  notice = null;
  notify();
}

/** Empties the cart after an order is placed. */
export function clearCart() {
  commit([]);
}

/** Adds several lines at once (reorder). */
export function addLines(next: CartLine[]) {
  commit(next.reduce((current, line) => addLine(current, line, line.qty), getLines()));
}

export function useCartDrawer() {
  return useSyncExternalStore(
    subscribe,
    () => drawerOpen,
    () => false,
  );
}

export function setCartDrawerOpen(open: boolean) {
  drawerOpen = open;
  notify();
}
