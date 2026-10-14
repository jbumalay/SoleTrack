const WISHLIST_KEY = "soletrack_wishlist";

/** Wishlist is intentionally localStorage-only for now (no server table yet). */
export function readWishlist(): number[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}

export function writeWishlist(ids: number[]): void {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

export function isWishlisted(productId: number): boolean {
  return readWishlist().includes(productId);
}

/** Add/remove a product and persist. Returns the updated id list. */
export function toggleWishlistId(productId: number): number[] {
  const current = readWishlist();
  const updated = current.includes(productId)
    ? current.filter((x) => x !== productId)
    : [...current, productId];
  writeWishlist(updated);
  return updated;
}

export function removeFromWishlist(productId: number): number[] {
  const updated = readWishlist().filter((x) => x !== productId);
  writeWishlist(updated);
  return updated;
}
