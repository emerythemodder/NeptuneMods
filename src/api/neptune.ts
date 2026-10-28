import { renderMarkdown } from "../lib/html";
import { getJson } from "./http";
import { getModrinthCategories } from "./modrinth";
import type { Category, ContentType, Project, ProjectDetail, ProjectLink, ProjectVersion, SearchParams, SourceResult } from "./types";

// Neptune projects are listed in registry/projects.json in the site's repo. The build
// turns that into ./registry.json with GitHub release data, so there are no API calls here.

interface RegistryVersion {
  id: string;
  name: string;
  tag: string;
  date: string;
  channel: "release" | "beta";
  downloads: number;
  gameVersions?: string[];
  fileName: string;
  downloadUrl: string | null;
  pageUrl: string;
}

export interface RegistryProject {
  slug: string;
  title: string;
  summary: string;
  type: ContentType;
  repo: string;
  loaders: string[];
  gameVersions: string[];
  categories: string[];
  icon: string | null;
  links: Partial<Record<"website" | "discord" | "wiki" | "donate", string>>;
  author: string;
  submittedBy: string;
  downloads: number;
  stars: number;
  created: string;
  updated: string;
  license: string | null;
  issues?: string | null;
  defaultBranch?: string;
  body: string;
  versions: RegistryVersion[];
}

export function loadRegistry(): Promise<RegistryProject[]> {
  return getJson<{ projects: RegistryProject[] }>("./registry.json")
    .then((r) => r.projects)
    .catch(() => []);
}

const repoUrl = (repo: string) => `https://github.com/${repo}`;

export function toProject(r: RegistryProject): Project {
  return {
    source: "neptune",
    id: r.slug,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    icon: r.icon,
    author: r.author || r.repo.split("/")[0],
    downloads: r.downloads,
    follows: r.stars,
    updated: r.updated,
    created: r.created,
    categories: r.categories,
    loaders: r.loaders,
    gameVersions: r.gameVersions,
    url: repoUrl(r.repo),
    type: r.type,
  };
}

function score(r: RegistryProject, q: string): number {
  const t = r.title.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 50;
  if (t.includes(q)) return 30;
  if (r.slug.includes(q) || r.author?.toLowerCase().includes(q)) return 20;
  if (r.summary.toLowerCase().includes(q)) return 10;
  return 0;
}

const time = (s: string) => new Date(s).getTime() || 0;

export async function searchNeptune(p: SearchParams, limit: number): Promise<SourceResult> {
  const q = p.query.trim().toLowerCase();
  let list = (await loadRegistry()).filter(
    (r) =>
      r.type === p.type &&
      (!p.gameVersion || r.gameVersions.includes(p.gameVersion)) &&
      (!p.loader || r.loaders.includes(p.loader)) &&
      (!p.category || r.categories.includes(p.category)) &&
      (!q || score(r, q) > 0),
  );
  const by: Record<SearchParams["sort"], (a: RegistryProject, b: RegistryProject) => number> = {
    relevance: (a, b) => (q ? score(b, q) - score(a, q) : 0) || b.downloads - a.downloads,
    downloads: (a, b) => b.downloads - a.downloads,
    follows: (a, b) => b.stars - a.stars,
    newest: (a, b) => time(b.created) - time(a.created),
    updated: (a, b) => time(b.updated) - time(a.updated),
  };
  list = [...list].sort(by[p.sort]);
  const start = (p.page - 1) * limit;
  return { hits: list.slice(start, start + limit).map(toProject), total: list.length };
}

async function find(slug: string): Promise<RegistryProject> {
  const r = (await loadRegistry()).find((x) => x.slug === slug);
  if (!r) throw new Error("This project isn't on Neptune (or hasn't been approved yet).");
  return r;
}

const LINK_LABELS = { website: "Website", discord: "Discord", wiki: "Wiki", donate: "Donate" } as const;

export async function getNeptuneProject(slug: string): Promise<ProjectDetail> {
  const r = await find(slug);
  const links: ProjectLink[] = [
    { label: "GitHub", url: repoUrl(r.repo) },
    { label: "Releases", url: `${repoUrl(r.repo)}/releases` },
  ];
  if (r.issues) links.push({ label: "Issues", url: r.issues });
  for (const [k, label] of Object.entries(LINK_LABELS)) {
    const url = r.links?.[k as keyof typeof LINK_LABELS];
    if (url) links.push({ label, url });
  }
  return {
    ...toProject(r),
    bodyHtml: r.body ? renderMarkdown(r.body, { repo: r.repo, branch: r.defaultBranch || "HEAD" }) : "",
    gallery: [],
    links,
    license: r.license,
  };
}

export async function getNeptuneVersions(slug: string): Promise<ProjectVersion[]> {
  const r = await find(slug);
  return r.versions.map((v) => ({
    id: v.id,
    name: v.name,
    versionNumber: v.tag,
    date: v.date,
    downloads: v.downloads,
    // Only what the release name or tag states; loaders rarely differ between releases.
    gameVersions: v.gameVersions ?? [],
    loaders: r.loaders,
    channel: v.channel,
    fileName: v.fileName,
    downloadUrl: v.downloadUrl,
    pageUrl: v.pageUrl,
  }));
}

/** Neptune uses Modrinth's category names so the filters line up. */
export function getNeptuneCategories(type: ContentType): Promise<Category[]> {
  return getModrinthCategories(type === "worlds" ? "mods" : type);
}

export async function neptuneProjectsBy(githubUser: string): Promise<Project[]> {
  const u = githubUser.toLowerCase();
  return (await loadRegistry())
    .filter((r) => r.submittedBy?.toLowerCase() === u || r.repo.split("/")[0].toLowerCase() === u)
    .sort((a, b) => b.downloads - a.downloads)
    .map(toProject);
}
