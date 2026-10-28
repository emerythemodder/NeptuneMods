import { CONTENT } from "../lib/content";
import { getCurseForgeProject, getCurseForgeVersions, searchCurseForge } from "./curseforge";
import { getModrinthProject, getModrinthVersions, searchModrinth } from "./modrinth";
import { getNeptuneProject, getNeptuneVersions, searchNeptune } from "./neptune";
import type { ContentType, Project, ProjectDetail, ProjectVersion, SearchParams, Source, SourceResult } from "./types";

export type SourceFilter = "all" | Source;

export interface CombinedResult {
  hits: Project[];
  pages: number;
  neptune?: SourceResult;
  modrinth?: SourceResult;
  curseforge?: SourceResult;
}

export const PAGE_SIZE = 20;

export const SOURCE_LABELS: Record<Source, string> = { neptune: "Neptune", modrinth: "Modrinth", curseforge: "CurseForge" };

/** Sources that host a content type. Neptune accepts every type. */
export function sourcesFor(type: ContentType): Source[] {
  const c = CONTENT[type];
  return ["neptune", ...(c.modrinth ? (["modrinth"] as const) : []), ...(c.curseforge ? (["curseforge"] as const) : [])];
}

async function settle(p: Promise<SourceResult>): Promise<SourceResult> {
  try {
    return await p;
  } catch (e) {
    return { hits: [], total: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

function interleave(lists: Project[][]): Project[] {
  const out: Project[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}

const time = (s: string) => new Date(s).getTime() || 0;

function merge(lists: Project[][], sort: SearchParams["sort"]): Project[] {
  // Each source already ranks by relevance/popularity its own way, so keep their orders.
  if (sort === "relevance" || sort === "follows") return interleave(lists);
  const key =
    sort === "downloads" ? (p: Project) => p.downloads : sort === "newest" ? (p: Project) => time(p.created) : (p: Project) => time(p.updated);
  return lists.flat().sort((x, y) => key(y) - key(x));
}

const titleKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Many projects are listed on more than one site; keep whichever copy ranks higher. */
function dropCrossListed(list: Project[]): Project[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    const k = titleKey(p.title);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function searchAll(p: SearchParams, source: SourceFilter): Promise<CombinedResult> {
  // When showing every source, take half a page from each of the big two.
  const limit = source === "all" ? PAGE_SIZE / 2 : PAGE_SIZE;
  const want = (s: Source) => source === "all" || source === s;
  const [neptune, mr, cf] = await Promise.all([
    want("neptune") ? settle(searchNeptune(p, limit)) : undefined,
    want("modrinth") ? settle(searchModrinth(p, limit)) : undefined,
    want("curseforge") ? settle(searchCurseForge(p, limit)) : undefined,
  ]);
  const pagesFor = (r?: SourceResult) => (r && !r.error ? Math.ceil(Math.min(r.total, 10_000) / limit) : 0);
  // Neptune goes first so its own projects win when a title is cross-listed.
  const merged = merge([neptune?.hits ?? [], mr?.hits ?? [], cf?.hits ?? []], p.sort);
  return {
    hits: source === "all" ? dropCrossListed(merged) : merged,
    pages: Math.max(pagesFor(neptune), pagesFor(mr), pagesFor(cf)),
    neptune,
    modrinth: mr,
    curseforge: cf,
  };
}

export function getProject(source: Source, id: string): Promise<ProjectDetail> {
  if (source === "neptune") return getNeptuneProject(id);
  return source === "modrinth" ? getModrinthProject(id) : getCurseForgeProject(id);
}

export function getVersions(p: ProjectDetail): Promise<ProjectVersion[]> {
  if (p.source === "neptune") return getNeptuneVersions(p.id);
  return p.source === "modrinth" ? getModrinthVersions(p.id) : getCurseForgeVersions(p.id, p.url);
}
