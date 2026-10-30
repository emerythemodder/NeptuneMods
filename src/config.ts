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

/**
 * Supabase project for accounts (email, Google, Microsoft and Discord sign-in) and syncing
 * profiles between devices. Both values are public by design; access is limited by the
 * row-level security rules in supabase/schema.sql. Leave empty to run without accounts.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/** GitHub repo whose Releases host the Neptune Launcher installer. */
export const LAUNCHER_REPO: string = NEPTUNE_REPO || "emerythemodder/NeptuneMods";

/** File name the launcher build gives its installer (neptune-launcher/package.json). */
export const LAUNCHER_ASSET = "Neptune-Launcher-Setup.exe";
