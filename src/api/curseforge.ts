import { CURSEFORGE_API_KEY } from "../config";
import { CONTENT, CURSEFORGE_GAME, loaderLabel } from "../lib/content";
import { releasesDesc } from "../lib/versions";
import { sanitizeHtml } from "../lib/html";
import { getJson } from "./http";
import type {
  Category,
  ContentType,
  Project,
  ProjectDetail,
  ProjectLink,
  ProjectVersion,
  SearchParams,
  SortKey,
  SourceResult,
} from "./types";

const API = "https://api.curseforge.com/v1";
// CurseForge refuses any request where index + pageSize goes past this.
const MAX_RESULTS = 10_000;

const headers = { "x-api-key": CURSEFORGE_API_KEY, Accept: "application/json" };
const cf = <T>(path: string) => getJson<T>(`${API}${path}`, headers);

/** CurseForge `modLoaderType` ids. Loaders not listed here can't be filtered on CurseForge. */
const LOADER_IDS: Record<string, number> = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 };
const LOADER_NAMES: Record<number, string> = { 1: "forge", 2: "cauldron", 3: "liteloader", 4: "fabric", 5: "quilt", 6: "neoforge" };

/** CurseForge `sortField` ids. It has no relevance or follower sort, so both use popularity. */
const SORT_FIELDS: Record<SortKey, number> = {
  relevance: 2,
  follows: 2,
  downloads: 6,
  updated: 3,
  newest: 11,
};

const TYPE_FROM_CLASS: Record<number, ContentType> = Object.fromEntries(
  (Object.entries(CONTENT) as [ContentType, (typeof CONTENT)[ContentType]][])
    .filter(([, c]) => c.curseforge != null)
    .map(([t, c]) => [c.curseforge!, t]),
);

interface CfMod {
  id: number;
  name: string;
  slug: string;
  summary: string;
  classId: number;
  downloadCount: number;
  dateCreated: string;
  dateModified: string;
  logo: { url: string; thumbnailUrl: string } | null;
  authors: { name: string; url: string }[];
  categories: { id: number; name: string }[];
  links: { websiteUrl: string; wikiUrl: string; issuesUrl: string; sourceUrl: string };
  screenshots: { title: string; description: string; thumbnailUrl: string; url: string }[];
  latestFilesIndexes: { gameVersion: string; modLoader?: number }[];
}

interface CfFile {
  id: number;
  displayName: string;
  fileName: string;
  fileDate: string;
  downloadCount: number;
  releaseType: 1 | 2 | 3;
  gameVersions: string[];
  downloadUrl: string | null;
}

function fromMod(m: CfMod, fallbackType: ContentType): Project {
  const versions = [...new Set(m.latestFilesIndexes.map((f) => f.gameVersion))];
  const loaders = [
    ...new Set(m.latestFilesIndexes.map((f) => (f.modLoader ? LOADER_NAMES[f.modLoader] : undefined)).filter(Boolean)),
  ] as string[];
  return {
    source: "curseforge",
    id: String(m.id),
    slug: m.slug,
    title: m.name,
    summary: m.summary,
    icon: m.logo?.thumbnailUrl || m.logo?.url || null,
    author: m.authors[0]?.name ?? "Unknown",
    downloads: m.downloadCount,
    follows: null,
    updated: m.dateModified,
    created: m.dateCreated,
    categories: m.categories.map((c) => c.name),
    loaders,
    gameVersions: versions,
    url: m.links.websiteUrl,
    type: TYPE_FROM_CLASS[m.classId] ?? fallbackType,
  };
}

export async function searchCurseForge(p: SearchParams, limit: number): Promise<SourceResult> {
  const classId = CONTENT[p.type].curseforge;
  if (classId == null) return { hits: [], total: 0, skipped: "CurseForge doesn't host this content type." };

  const qs = new URLSearchParams({
    gameId: String(CURSEFORGE_GAME[CONTENT[p.type].edition]),
    classId: String(classId),
    sortField: String(SORT_FIELDS[p.sort]),
    sortOrder: "desc",
    pageSize: String(limit),
  });
  if (p.query) qs.set("searchFilter", p.query);
  if (p.gameVersion) qs.set("gameVersion", p.gameVersion);
  if (p.category) qs.set("categoryId", p.category);
  if (p.loader) {
    const id = LOADER_IDS[p.loader];
    if (id == null) {
      return { hits: [], total: 0, skipped: `CurseForge can't filter ${CONTENT[p.type].label.toLowerCase()} by ${loaderLabel(p.loader)}.` };
    }
    qs.set("modLoaderType", String(id));
  }

  const index = (p.page - 1) * limit;
  if (index + limit > MAX_RESULTS) {
    return { hits: [], total: MAX_RESULTS, capped: true, skipped: "CurseForge only returns the first 10,000 results." };
  }
  qs.set("index", String(index));

  const res = await cf<{ data: CfMod[]; pagination: { totalCount: number } }>(`/mods/search?${qs}`);
  return {
    hits: res.data.map((m) => fromMod(m, p.type)),
    total: res.pagination.totalCount,
    capped: res.pagination.totalCount >= MAX_RESULTS,
  };
}

export async function getCurseForgeProject(id: string): Promise<ProjectDetail> {
  const [{ data: m }, desc] = await Promise.all([
    cf<{ data: CfMod }>(`/mods/${encodeURIComponent(id)}`),
    cf<{ data: string }>(`/mods/${encodeURIComponent(id)}/description`).catch(() => ({ data: "" })),
  ]);
  const base = fromMod(m, "mods");
  const links: ProjectLink[] = [{ label: "CurseForge", url: m.links.websiteUrl }];
  if (m.links.sourceUrl) links.push({ label: "Source", url: m.links.sourceUrl });
  if (m.links.issuesUrl) links.push({ label: "Issues", url: m.links.issuesUrl });
  if (m.links.wikiUrl) links.push({ label: "Wiki", url: m.links.wikiUrl });
  return {
    ...base,
    bodyHtml: sanitizeHtml(desc.data || ""),
    gallery: m.screenshots.map((s) => ({ url: s.url, thumb: s.thumbnailUrl || s.url, title: s.title, description: s.description })),
    links,
    license: null,
  };
}

const CHANNEL = { 1: "release", 2: "beta", 3: "alpha" } as const;
const KNOWN_LOADERS = new Set(["forge", "fabric", "quilt", "neoforge"]);

export async function getCurseForgeVersions(id: string, websiteUrl: string): Promise<ProjectVersion[]> {
  const { data } = await cf<{ data: CfFile[] }>(`/mods/${encodeURIComponent(id)}/files?pageSize=50`);
  const newestFirst = [...data].sort((a, b) => new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime());
  return newestFirst.map((f) => ({
    id: String(f.id),
    name: f.displayName,
    versionNumber: f.displayName,
    date: f.fileDate,
    downloads: f.downloadCount,
    // CurseForge mixes loaders and side tags ("Client") into gameVersions.
    gameVersions: f.gameVersions.filter((v) => /^\d/.test(v)),
    loaders: f.gameVersions.map((v) => v.toLowerCase()).filter((v) => KNOWN_LOADERS.has(v)),
    channel: CHANNEL[f.releaseType] ?? "release",
    fileName: f.fileName,
    downloadUrl: f.downloadUrl,
    pageUrl: `${websiteUrl}/files/${f.id}`,
  }));
}

export async function getCurseForgeCategories(type: ContentType): Promise<Category[]> {
  const classId = CONTENT[type].curseforge;
  if (classId == null) return [];
  const { data } = await cf<{ data: { id: number; name: string; isClass?: boolean }[] }>(
    `/categories?gameId=${CURSEFORGE_GAME[CONTENT[type].edition]}&classId=${classId}`,
  );
  return data
    .filter((c) => !c.isClass)
    .map((c) => ({ id: String(c.id), name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Bedrock game versions, newest first. Modrinth's list only covers Java. */
export async function getBedrockVersions(): Promise<string[]> {
  const { data } = await cf<{ data: { versions: string[] }[] }>(`/games/${CURSEFORGE_GAME.bedrock}/versions`);
  return releasesDesc(data.flatMap((t) => t.versions));
}
