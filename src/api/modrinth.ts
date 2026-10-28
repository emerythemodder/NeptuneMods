import { CONTENT } from "../lib/content";
import { renderMarkdown } from "../lib/html";
import { getJson } from "./http";
import type {
  Category,
  ContentType,
  Project,
  ProjectDetail,
  ProjectLink,
  ProjectVersion,
  SearchParams,
  SourceResult,
} from "./types";

const API = "https://api.modrinth.com/v2";

// Modrinth mixes loaders into `categories`; these are the loader names to split out.
const LOADERS = new Set([
  "babric", "bta-babric", "bukkit", "bungeecord", "canvas", "datapack", "fabric", "folia", "forge",
  "geyser", "iris", "java-agent", "legacy-fabric", "liteloader", "minecraft", "modloader", "neoforge",
  "nilloader", "optifine", "ornithe", "paper", "purpur", "quilt", "rift", "spigot", "sponge",
  "vanilla", "velocity", "waterfall",
]);

const TYPE_FROM_MR: Record<string, ContentType> = {
  mod: "mods",
  modpack: "modpacks",
  resourcepack: "resourcepacks",
  shader: "shaders",
  datapack: "datapacks",
  plugin: "plugins",
};

interface MrHit {
  project_id: string;
  project_type: string;
  slug: string;
  author: string;
  title: string;
  description: string;
  categories: string[];
  versions: string[];
  downloads: number;
  follows: number;
  icon_url: string | null;
  date_created: string;
  date_modified: string;
}

interface MrProject {
  id: string;
  slug: string;
  project_type: string;
  title: string;
  description: string;
  body: string;
  published: string;
  updated: string;
  license?: { id: string; name: string } | null;
  downloads: number;
  followers: number;
  categories: string[];
  additional_categories: string[];
  loaders: string[];
  game_versions: string[];
  icon_url: string | null;
  issues_url: string | null;
  source_url: string | null;
  wiki_url: string | null;
  discord_url: string | null;
  donation_urls?: { platform: string; url: string }[];
  gallery: { url: string; raw_url: string; title: string | null; description: string | null; ordering: number }[];
  organization: string | null;
}

interface MrVersion {
  id: string;
  name: string;
  version_number: string;
  date_published: string;
  downloads: number;
  game_versions: string[];
  loaders: string[];
  version_type: "release" | "beta" | "alpha";
  files: { url: string; filename: string; primary: boolean }[];
}

export interface MrUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created: string;
}

export type MrUserProject = MrProject;

const projectUrl = (slug: string) => `https://modrinth.com/project/${slug}`;

function splitCategories(all: string[]) {
  return {
    loaders: all.filter((c) => LOADERS.has(c)),
    categories: all.filter((c) => !LOADERS.has(c)),
  };
}

function fromHit(h: MrHit, type: ContentType): Project {
  const { loaders, categories } = splitCategories(h.categories);
  return {
    source: "modrinth",
    id: h.project_id,
    slug: h.slug,
    title: h.title,
    summary: h.description,
    icon: h.icon_url || null,
    author: h.author,
    downloads: h.downloads,
    follows: h.follows,
    updated: h.date_modified,
    created: h.date_created,
    categories,
    loaders,
    gameVersions: h.versions,
    url: projectUrl(h.slug),
    type,
  };
}

const SORT_INDEX: Record<SearchParams["sort"], string> = {
  relevance: "relevance",
  downloads: "downloads",
  follows: "follows",
  newest: "newest",
  updated: "updated",
};

export async function searchModrinth(p: SearchParams, limit: number): Promise<SourceResult> {
  const mrType = CONTENT[p.type].modrinth;
  if (!mrType) return { hits: [], total: 0, skipped: "Modrinth doesn't host this content type." };

  const facets: string[][] = [[`project_type:${mrType}`]];
  if (p.gameVersion) facets.push([`versions:${p.gameVersion}`]);
  if (p.loader) facets.push([`categories:${p.loader}`]);
  if (p.category) facets.push([`categories:${p.category}`]);

  const qs = new URLSearchParams({
    query: p.query,
    facets: JSON.stringify(facets),
    index: SORT_INDEX[p.sort],
    limit: String(limit),
    offset: String((p.page - 1) * limit),
  });
  const res = await getJson<{ hits: MrHit[]; total_hits: number }>(`${API}/search?${qs}`);
  return { hits: res.hits.map((h) => fromHit(h, p.type)), total: res.total_hits };
}

export async function getModrinthProject(id: string): Promise<ProjectDetail> {
  const [p, members] = await Promise.all([
    getJson<MrProject>(`${API}/project/${encodeURIComponent(id)}`),
    getJson<{ role: string; user: { username: string } }[]>(`${API}/project/${encodeURIComponent(id)}/members`).catch(
      () => [],
    ),
  ]);
  let author: string | undefined = members.find((m) => m.role === "Owner")?.user.username ?? members[0]?.user.username;
  if (!author && p.organization) {
    author = await getJson<{ name: string }>(`${API}/organization/${p.organization}`)
      .then((o) => o.name)
      .catch(() => undefined);
  }

  const links: ProjectLink[] = [{ label: "Modrinth", url: projectUrl(p.slug) }];
  if (p.source_url) links.push({ label: "Source", url: p.source_url });
  if (p.issues_url) links.push({ label: "Issues", url: p.issues_url });
  if (p.wiki_url) links.push({ label: "Wiki", url: p.wiki_url });
  if (p.discord_url) links.push({ label: "Discord", url: p.discord_url });
  for (const d of p.donation_urls ?? []) links.push({ label: d.platform || "Donate", url: d.url });

  const type = TYPE_FROM_MR[p.project_type] ?? "mods";
  return {
    source: "modrinth",
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.description,
    icon: p.icon_url || null,
    author: author ?? "Unknown",
    downloads: p.downloads,
    follows: p.followers,
    updated: p.updated,
    created: p.published,
    categories: [...p.categories, ...p.additional_categories].filter((c) => !LOADERS.has(c)),
    loaders: p.loaders,
    gameVersions: p.game_versions,
    url: projectUrl(p.slug),
    type,
    bodyHtml: renderMarkdown(p.body),
    gallery: [...p.gallery]
      .sort((a, b) => a.ordering - b.ordering)
      .map((g) => ({ url: g.raw_url, thumb: g.url, title: g.title ?? "", description: g.description ?? "" })),
    links,
    license: p.license?.name || p.license?.id || null,
  };
}

export async function getModrinthVersions(id: string): Promise<ProjectVersion[]> {
  const vs = await getJson<MrVersion[]>(`${API}/project/${encodeURIComponent(id)}/version`);
  return vs.map((v) => {
    const file = v.files.find((f) => f.primary) ?? v.files[0];
    return {
      id: v.id,
      name: v.name,
      versionNumber: v.version_number,
      date: v.date_published,
      downloads: v.downloads,
      gameVersions: v.game_versions,
      loaders: v.loaders,
      channel: v.version_type,
      fileName: file?.filename ?? "",
      downloadUrl: file?.url ?? null,
      pageUrl: `https://modrinth.com/project/${id}/version/${v.id}`,
    };
  });
}

export async function getModrinthCategories(type: ContentType): Promise<Category[]> {
  const mrType = CONTENT[type].modrinth;
  if (!mrType) return [];
  // Data packs and plugins reuse the mod category list on Modrinth.
  const tagType = mrType === "datapack" || mrType === "plugin" ? "mod" : mrType;
  const all = await getJson<{ name: string; project_type: string; header: string }[]>(`${API}/tag/category`);
  return all
    .filter((c) => c.project_type === tagType && !LOADERS.has(c.name))
    .map((c) => ({ id: c.name, name: c.name.replace(/-/g, " ") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGameVersions(): Promise<string[]> {
  const all = await getJson<{ version: string; version_type: string }[]>(`${API}/tag/game_version`);
  return all.filter((v) => v.version_type === "release").map((v) => v.version);
}

export function getModrinthStats() {
  return getJson<{ projects: number; versions: number; files: number; authors: number }>(`${API}/statistics`);
}

export function getModrinthUser(username: string) {
  return getJson<MrUser>(`${API}/user/${encodeURIComponent(username)}`);
}

export function getModrinthUserProjects(username: string) {
  return getJson<MrUserProject[]>(`${API}/user/${encodeURIComponent(username)}/projects`);
}

export function typeFromModrinth(t: string): ContentType {
  return TYPE_FROM_MR[t] ?? "mods";
}
