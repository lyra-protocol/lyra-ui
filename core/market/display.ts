export function getDisplaySymbol(productId: string) {
  return productId.replace(/-USD$/i, "");
}
