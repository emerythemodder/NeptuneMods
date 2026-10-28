import type { ContentType, SortKey } from "../api/types";

export interface ContentConfig {
  label: string;
  singular: string;
  /** Modrinth `project_type` facet, or null if Modrinth doesn't host this type. */
  modrinth: string | null;
  /** CurseForge class id, or null if CurseForge doesn't host this type. */
  curseforge: number | null;
  /** Loader filter values (Modrinth loader names). */
  loaders: string[];
}

export const CONTENT: Record<ContentType, ContentConfig> = {
  mods: {
    label: "Mods",
    singular: "mod",
    modrinth: "mod",
    curseforge: 6,
    loaders: ["fabric", "forge", "neoforge", "quilt"],
  },
  modpacks: {
    label: "Modpacks",
    singular: "modpack",
    modrinth: "modpack",
    curseforge: 4471,
    loaders: ["fabric", "forge", "neoforge", "quilt"],
  },
  resourcepacks: {
    label: "Resource packs",
    singular: "resource pack",
    modrinth: "resourcepack",
    curseforge: 12,
    loaders: [],
  },
  shaders: {
    label: "Shaders",
    singular: "shader",
    modrinth: "shader",
    curseforge: 6552,
    loaders: ["iris", "optifine", "canvas", "vanilla"],
  },
  datapacks: {
    label: "Data packs",
    singular: "data pack",
    modrinth: "datapack",
    curseforge: 6945,
    loaders: [],
  },
  plugins: {
    label: "Plugins",
    singular: "plugin",
    modrinth: "plugin",
    curseforge: 5,
    loaders: ["paper", "spigot", "bukkit", "purpur", "folia", "velocity", "bungeecord"],
  },
  worlds: {
    label: "Worlds",
    singular: "world",
    modrinth: null,
    curseforge: 17,
    loaders: [],
  },
};

export const CONTENT_TYPES = Object.keys(CONTENT) as ContentType[];

export function isContentType(v: string): v is ContentType {
  return v in CONTENT;
}

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "downloads", label: "Downloads" },
  { value: "follows", label: "Popularity" },
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Recently updated" },
];

const LOADER_LABELS: Record<string, string> = {
  neoforge: "NeoForge",
  optifine: "OptiFine",
  bungeecord: "BungeeCord",
};

export function loaderLabel(l: string): string {
  return LOADER_LABELS[l] ?? l.charAt(0).toUpperCase() + l.slice(1);
}

export function labelize(s: string): string {
  const t = s.replace(/[-_]/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
