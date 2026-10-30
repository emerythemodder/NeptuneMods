import type { ContentType, Edition, SortKey } from "../api/types";

export interface ContentConfig {
  edition: Edition;
  label: string;
  singular: string;
  /** Modrinth `project_type` facet, or null if Modrinth doesn't host this type. */
  modrinth: string | null;
  /** CurseForge class id, or null if CurseForge doesn't host this type. */
  curseforge: number | null;
  /** File types players download, shown as a hint when publishing. */
  files: string[];
  /** Loader filter values (Modrinth loader names). */
  loaders: string[];
}

export const CONTENT: Record<ContentType, ContentConfig> = {
  mods: {
    edition: "java",
    label: "Mods",
    singular: "mod",
    modrinth: "mod",
    curseforge: 6,
    files: [".jar"],
    loaders: ["fabric", "forge", "neoforge", "quilt"],
  },
  modpacks: {
    edition: "java",
    label: "Modpacks",
    singular: "modpack",
    modrinth: "modpack",
    curseforge: 4471,
    files: [".mrpack", ".zip"],
    loaders: ["fabric", "forge", "neoforge", "quilt"],
  },
  resourcepacks: {
    edition: "java",
    label: "Resource packs",
    singular: "resource pack",
    modrinth: "resourcepack",
    curseforge: 12,
    files: [".zip"],
    loaders: [],
  },
  shaders: {
    edition: "java",
    label: "Shaders",
    singular: "shader",
    modrinth: "shader",
    curseforge: 6552,
    files: [".zip"],
    loaders: ["iris", "optifine", "canvas", "vanilla"],
  },
  datapacks: {
    edition: "java",
    label: "Data packs",
    singular: "data pack",
    modrinth: "datapack",
    curseforge: 6945,
    files: [".zip"],
    loaders: [],
  },
  plugins: {
    edition: "java",
    label: "Plugins",
    singular: "plugin",
    modrinth: "plugin",
    curseforge: 5,
    files: [".jar"],
    loaders: ["paper", "spigot", "bukkit", "purpur", "folia", "velocity", "bungeecord"],
  },
  worlds: {
    edition: "java",
    label: "Worlds",
    singular: "world",
    modrinth: null,
    curseforge: 17,
    files: [".zip"],
    loaders: [],
  },
  "bedrock-addons": {
    edition: "bedrock",
    label: "Add-ons",
    singular: "Bedrock add-on",
    modrinth: null,
    curseforge: 4984,
    files: [".mcaddon", ".mcpack"],
    loaders: [],
  },
  "bedrock-maps": {
    edition: "bedrock",
    label: "Maps",
    singular: "Bedrock map",
    modrinth: null,
    curseforge: 6913,
    files: [".mcworld", ".mctemplate"],
    loaders: [],
  },
  "bedrock-texturepacks": {
    edition: "bedrock",
    label: "Texture packs",
    singular: "Bedrock texture pack",
    modrinth: null,
    curseforge: 6929,
    files: [".mcpack"],
    loaders: [],
  },
  "bedrock-scripts": {
    edition: "bedrock",
    label: "Scripts",
    singular: "Bedrock script",
    modrinth: null,
    curseforge: 6940,
    files: [".mcaddon", ".mcpack"],
    loaders: [],
  },
  "bedrock-skins": {
    edition: "bedrock",
    label: "Skins",
    singular: "Bedrock skin pack",
    modrinth: null,
    curseforge: 6925,
    files: [".mcpack"],
    loaders: [],
  },
};

export const CONTENT_TYPES = Object.keys(CONTENT) as ContentType[];

export const EDITIONS: { value: Edition; label: string }[] = [
  { value: "java", label: "Java" },
  { value: "bedrock", label: "Bedrock" },
];

export const typesFor = (e: Edition) => CONTENT_TYPES.filter((t) => CONTENT[t].edition === e);

/** CurseForge hosts the two editions as separate games. */
export const CURSEFORGE_GAME: Record<Edition, number> = { java: 432, bedrock: 78022 };

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
