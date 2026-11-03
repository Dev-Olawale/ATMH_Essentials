/** One option row in the product form, as text fields. Shared by the server page and the client form. */
export type VariantValues = {
  id?: string;
  /** Stable key for React while editing. */
  key: string;
  label: string;
  sku: string;
  price: string;
  compareAt: string;
  stock: string;
  lowStockThreshold: string;
};

export function emptyVariant(key: string): VariantValues {
  return { key, label: "", sku: "", price: "", compareAt: "", stock: "0", lowStockThreshold: "5" };
}
