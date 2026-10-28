// The site is static, so this key ships to every visitor's browser either way.
// Set VITE_CURSEFORGE_API_KEY (or the CURSEFORGE_API_KEY repo secret for the
// Pages workflow) to use your own key from https://console.curseforge.com.
export const CURSEFORGE_API_KEY: string =
  import.meta.env.VITE_CURSEFORGE_API_KEY || "$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm";

/**
 * The GitHub repo that hosts this site, where Neptune submissions are filed as issues.
 * The Pages workflow sets VITE_NEPTUNE_REPO; otherwise it's worked out from an
 * <owner>.github.io/<repo>/ address.
 */
export const NEPTUNE_REPO: string | null = import.meta.env.VITE_NEPTUNE_REPO || repoFromLocation();

function repoFromLocation(): string | null {
  const m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
  if (!m) return null;
  const first = location.pathname.split("/").filter(Boolean)[0];
  return first && first !== "index.html" ? `${m[1]}/${first}` : `${m[1]}/${m[1]}.github.io`;
}
