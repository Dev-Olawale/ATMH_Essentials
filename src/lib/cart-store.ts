"use client";

import { useSyncExternalStore } from "react";

import {
  addLine,
  cartCount,
  cartSubtotalKobo,
  removeLine,
  sanitizeLines,
  setLineQty,
  type CartLine,
} from "@/lib/cart";

const STORAGE_KEY = "atmh-cart-v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] | null = null;
let drawerOpen = false;
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
