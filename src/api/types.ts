export type Source = "neptune" | "modrinth" | "curseforge";

export type ContentType =
  | "mods"
  | "modpacks"
  | "resourcepacks"
  | "shaders"
  | "datapacks"
  | "plugins"
  | "worlds";

export type SortKey = "relevance" | "downloads" | "follows" | "newest" | "updated";

/** A project from either source, normalised to one shape. */
export interface Project {
  source: Source;
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: string | null;
  author: string;
  downloads: number;
  /** Modrinth followers, or GitHub stars for Neptune projects. CurseForge has neither, so null there. */
  follows: number | null;
  updated: string;
  created: string;
  categories: string[];
  loaders: string[];
  gameVersions: string[];
  url: string;
  type: ContentType;
}

export interface SearchParams {
  type: ContentType;
  query: string;
  gameVersion: string;
  loader: string;
  category: string;
  sort: SortKey;
  page: number;
}

export interface SourceResult {
  hits: Project[];
  total: number;
  /** True when the source reports a capped total (CurseForge stops at 10,000). */
  capped?: boolean;
  /** Set when this source was skipped because it can't apply the current filters. */
  skipped?: string;
  error?: string;
}

export interface ProjectVersion {
  id: string;
  name: string;
  versionNumber: string;
  date: string;
  downloads: number;
  gameVersions: string[];
  loaders: string[];
  channel: "release" | "beta" | "alpha";
  fileName: string;
  /** Direct download, or null when the author disallows third-party downloads. */
  downloadUrl: string | null;
  pageUrl: string;
}

export interface GalleryImage {
  url: string;
  thumb: string;
  title: string;
  description: string;
}

export interface ProjectLink {
  label: string;
  url: string;
}

export interface ProjectDetail extends Project {
  bodyHtml: string;
  gallery: GalleryImage[];
  links: ProjectLink[];
  license: string | null;
}

export interface Category {
  id: string;
  name: string;
}
