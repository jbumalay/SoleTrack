export interface SavedAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  zip_code: string;
  email?: string;
}

const ADDRESS_KEY = "soletrack_addresses";

/** Address book is localStorage-only until the backend exposes user addresses. */
export function getSavedAddresses(): SavedAddress[] {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedAddress[]) : [];
  } catch {
    return [];
  }
}

export function saveAddress(address: SavedAddress): SavedAddress[] {
  const list = getSavedAddresses();
  const idx = list.findIndex((a) => a.id === address.id);
  if (idx >= 0) list[idx] = address;
  else list.push(address);
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(list));
  return list;
}

export function deleteAddress(id: string): SavedAddress[] {
  const list = getSavedAddresses().filter((a) => a.id !== id);
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(list));
  return list;
}

export function newAddressId(): string {
  return `addr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Build the history-proof snapshot string the order stores. */
export function addressToSnapshot(address: {
  full_name: string; address: string; city: string; province: string; zip_code: string; phone: string;
}): string {
  return `${address.full_name}, ${address.address}, ${address.city}, ${address.province}, ${address.zip_code}. Phone: ${address.phone}`;
}

export function addressLine(address: SavedAddress): string {
  return `${address.address}, ${address.city}, ${address.province}, ${address.zip_code}`;
}
