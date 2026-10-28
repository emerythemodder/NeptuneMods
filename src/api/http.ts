const cache = new Map<string, Promise<unknown>>();

function host(url: string) {
  try {
    return new URL(url, location.href).hostname;
  } catch {
    return url;
  }
}

/** GET JSON with an in-memory cache so revisiting a page doesn't refetch. */
export function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const hit = cache.get(url);
  if (hit) return hit as Promise<T>;
  const req = fetch(url, { headers }).then(async (res) => {
    if (!res.ok) throw new Error(`${host(url)} responded ${res.status}`);
    return res.json() as Promise<T>;
  });
  cache.set(url, req);
  req.catch(() => cache.delete(url));
  return req;
}
