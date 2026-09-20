const store = new Map<string, { exp: number; value: unknown }>();

/** Tiny in-memory TTL cache. Swap for Redis/KV later without touching callers. */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  shouldCache: (value: T) => boolean = () => true,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.value as T;
  const value = await fn();
  if (shouldCache(value)) store.set(key, { exp: Date.now() + ttlMs, value });
  return value;
}
