import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes } from "react";

// Hash routing: GitHub Pages can't rewrite deep links to index.html, but it never sees the hash.

function read() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, qs = ""] = raw.split("?");
  return { path: path || "/", search: qs };
}

let current = read();
const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => {
  current = read();
  listeners.forEach((l) => l());
});

export function useRoute() {
  const r = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
  return { path: r.path, segments: r.path.split("/").filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(r.search) };
}

export function href(path: string, query?: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return `#${path}${s ? `?${s}` : ""}`;
}

export function navigate(path: string, query?: Record<string, string | number | undefined | null>, replace = false) {
  const h = href(path, query);
  if (replace) {
    history.replaceState(null, "", h);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = h;
  }
}

export function Link({ to, query, ...rest }: { to: string; query?: Record<string, string | number | undefined> } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href(to, query)} {...rest} />;
}

export function useScrollTopOn(key: string) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
}
