async function once<T>(url: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': 'ResQ-Atlas/0.1 (hackathon project)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // some feeds return an empty body when there are no results: treat that as "no data", not an error
    const text = await res.text();
    return (text.trim() ? JSON.parse(text) : {}) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch JSON with a generous timeout and one retry (public feeds are occasionally slow). */
export async function fetchJson<T = unknown>(url: string, timeoutMs = 15000): Promise<T> {
  try {
    return await once<T>(url, timeoutMs);
  } catch (first) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      return await once<T>(url, timeoutMs);
    } catch (second) {
      const msg = second instanceof Error ? (second.name === 'AbortError' ? 'timed out' : second.message) : 'request failed';
      throw new Error(msg);
    }
  }
}
