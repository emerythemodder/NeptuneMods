// Helpers for turning GitHub releases into Neptune versions.

const FILE_PREFERENCE = [/\.jar$/i, /\.mrpack$/i, /\.zip$/i];

/** The file players should download: a .jar, then .mrpack, then .zip, skipping source/dev jars. */
export function primaryAsset(assets) {
  for (const re of FILE_PREFERENCE) {
    const hit = assets.find((a) => re.test(a.name) && !/sources|javadoc|dev/i.test(a.name));
    if (hit) return hit;
  }
  return assets[0] ?? null;
}

// Release names and tags often say which game version they target, e.g. "v2.1 for 1.21.1"
// or "mc26.3-0.9.3". Only those explicit forms are trusted, since bare numbers are usually
// the mod's own version.
const MC_VERSION = /(?:\bfor\s+(?:minecraft\s+)?|\bmc[-_]?|\bminecraft[-_ ])(\d+\.\d+(?:\.\d+)?)/gi;

export function gameVersionsIn(...texts) {
  const found = new Set();
  for (const t of texts) for (const m of String(t ?? "").matchAll(MC_VERSION)) found.add(m[1]);
  return [...found];
}
