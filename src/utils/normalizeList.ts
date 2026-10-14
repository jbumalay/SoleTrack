/** Normalize paginated / wrapped list responses into a plain array. */
export function normalizeList<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const items = obj.items ?? obj.data ?? obj.results ?? obj.rows;
    if (Array.isArray(items)) return items as T[];
    // Some endpoints wrap as { data: { items } } one level deeper is handled by callers passing res.data
  }
  return [];
}

export default normalizeList;
