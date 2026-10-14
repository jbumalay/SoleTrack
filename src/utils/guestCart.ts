export interface GuestCartLine {
  product_id: number;
  quantity: number;
  size_id?: number;
  name?: string;
  price?: number;
  image_url?: string;
  stock_quantity?: number;
  /** Stable synthetic id so the shared cart UI can key rows. */
  guest_id: string;
}

const GUEST_CART_KEY = "soletrack_guest_cart";

/** Cart lines for logged-out shoppers, held in localStorage until login. */
export function readGuestCart(): GuestCartLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY) || "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((line: any) => ({
        product_id: Number(line.product_id),
        quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
        size_id: line.size_id !== undefined && line.size_id !== null ? Number(line.size_id) : undefined,
        name: line.name,
        price: line.price !== undefined ? Number(line.price) : undefined,
        image_url: line.image_url,
        stock_quantity: line.stock_quantity !== undefined ? Number(line.stock_quantity) : undefined,
        guest_id: String(line.guest_id ?? `guest-${line.product_id}-${line.size_id ?? "na"}`),
      }))
      .filter((line: GuestCartLine) => Number.isFinite(line.product_id));
  } catch {
    return [];
  }
}

export function writeGuestCart(lines: GuestCartLine[]): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
}

/** Add (or merge) a guest line, capping at available stock when known. */
export function addGuestCartLine(line: Omit<GuestCartLine, "guest_id">): GuestCartLine[] {
  const lines = readGuestCart();
  const existing = lines.find(
    (l) => l.product_id === Number(line.product_id) && l.size_id === (line.size_id ?? undefined)
  );
  if (existing) {
    const cap = line.stock_quantity !== undefined ? Number(line.stock_quantity) : Infinity;
    existing.quantity = Math.min(existing.quantity + line.quantity, cap);
  } else {
    lines.push({
      ...line,
      quantity: Math.min(line.quantity, line.stock_quantity !== undefined ? Number(line.stock_quantity) : line.quantity),
      guest_id: `guest-${line.product_id}-${line.size_id ?? "na"}-${Date.now()}`,
    });
  }
  writeGuestCart(lines);
  return lines;
}

export function updateGuestCartLine(guestId: string, quantity: number): GuestCartLine[] {
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1) return readGuestCart();
  const lines = readGuestCart().map((l) => (l.guest_id === guestId ? { ...l, quantity: qty } : l));
  writeGuestCart(lines);
  return lines;
}

export function removeGuestCartLine(guestId: string): GuestCartLine[] {
  const lines = readGuestCart().filter((l) => l.guest_id !== guestId);
  writeGuestCart(lines);
  return lines;
}

export function clearGuestCart(): void {
  localStorage.removeItem(GUEST_CART_KEY);
}

export function guestCartCount(): number {
  return readGuestCart().reduce((sum, l) => sum + l.quantity, 0);
}
