// Shared rules for Neptune registry entries. Used by the submission workflow, the
// registry build and (via src/lib/neptuneSchema.ts) the publish form.

export const TYPES = ["mods", "modpacks", "resourcepacks", "shaders", "datapacks", "plugins", "worlds"];
export const LOADERS = [
  "fabric", "forge", "neoforge", "quilt", "iris", "optifine", "canvas", "vanilla",
  "paper", "spigot", "bukkit", "purpur", "folia", "velocity", "bungeecord", "datapack",
];
export const LINK_KEYS = ["website", "discord", "wiki", "donate"];

const SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/;
const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
const GAME_VERSION = /^\d+(\.\d+){1,2}$/;
const CATEGORY = /^[a-z0-9-]{1,32}$/;
const HTTPS = /^https:\/\/[^\s"<>]{3,300}$/;

const str = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Validate and normalise a submission. Returns { entry, errors }.
 * Only known fields are kept, so extra keys in a submission are dropped.
 */
export function validateEntry(input) {
  const errors = [];
  const o = input && typeof input === "object" ? input : {};

  const slug = str(o.slug).toLowerCase();
  if (!SLUG.test(slug)) errors.push("slug must be 2–41 characters: lowercase letters, numbers and dashes.");

  const title = str(o.title);
  if (title.length < 2 || title.length > 60) errors.push("title must be 2–60 characters.");

  const summary = str(o.summary);
  if (summary.length < 10 || summary.length > 200) errors.push("summary must be 10–200 characters.");

  const type = str(o.type);
  if (!TYPES.includes(type)) errors.push(`type must be one of: ${TYPES.join(", ")}.`);

  const repo = str(o.repo).replace(/^https:\/\/github\.com\//i, "").replace(/\.git$|\/$/g, "");
  if (!REPO.test(repo)) errors.push("repo must look like owner/name.");

  const list = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
  const loaders = [...new Set(list(o.loaders).map((l) => l.toLowerCase()))];
  if (loaders.some((l) => !LOADERS.includes(l))) errors.push("loaders contains an unknown loader.");
  if (loaders.length > 8) errors.push("at most 8 loaders.");

  const gameVersions = [...new Set(list(o.gameVersions))];
  if (gameVersions.some((v) => !GAME_VERSION.test(v))) errors.push("gameVersions must be release versions like 1.21.1.");
  if (gameVersions.length > 80) errors.push("at most 80 game versions.");

  const categories = [...new Set(list(o.categories).map((c) => c.toLowerCase()))];
  if (categories.some((c) => !CATEGORY.test(c))) errors.push("categories contains an invalid value.");
  if (categories.length > 3) errors.push("at most 3 categories.");

  const icon = str(o.icon);
  if (icon && !HTTPS.test(icon)) errors.push("icon must be an https URL.");

  const links = {};
  const rawLinks = o.links && typeof o.links === "object" ? o.links : {};
  for (const k of LINK_KEYS) {
    const v = str(rawLinks[k]);
    if (!v) continue;
    if (!HTTPS.test(v)) errors.push(`links.${k} must be an https URL.`);
    else links[k] = v;
  }

  return {
    errors,
    entry: { slug, title, summary, type, repo, loaders, gameVersions, categories, icon, links },
  };
}

/** Pull the JSON block out of a submission issue body. */
export function parseSubmission(body) {
  if (typeof body !== "string" || !body.includes("<!-- neptune-submission -->")) return null;
  const m = body.match(/```json\s*([\s\S]*?)```/);
  if (!m) return { error: "No ```json block found." };
  try {
    return { data: JSON.parse(m[1]) };
  } catch (e) {
    return { error: `The JSON block is invalid: ${e.message}` };
  }
}
