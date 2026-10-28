import { useSyncExternalStore } from "react";
import type { ContentType, Project, Source } from "../api/types";
import type { SourceFilter } from "../api/search";

/** A small localStorage-backed store. Everything here lives only in the visitor's browser. */
function createStore<T extends object>(key: string, defaults: T) {
  let state: T = load();
  const listeners = new Set<() => void>();

  function load(): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  }

  function set(next: T | ((s: T) => T)): boolean {
    state = typeof next === "function" ? (next as (s: T) => T)(state) : next;
    listeners.forEach((l) => l());
    try {
      localStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch {
      // Storage full or blocked; the change still applies for this visit.
      return false;
    }
  }

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  return {
    get: () => state,
    set,
    reset: () => set(defaults),
    use: () => useSyncExternalStore(subscribe, () => state),
  };
}

export interface SavedProject {
  source: Source;
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: string | null;
  author: string;
  type: ContentType;
  downloads: number;
}

export function toSaved(p: Project): SavedProject {
  const { source, id, slug, title, summary, icon, author, type, downloads } = p;
  return { source, id, slug, title, summary, icon, author, type, downloads };
}

export const sameProject = (a: { source: Source; id: string }, b: { source: Source; id: string }) =>
  a.source === b.source && a.id === b.id;

export type AvatarKind = "initials" | "image" | "minecraft";
export type BannerKind = "color" | "gradient" | "image";

export interface Profile {
  displayName: string;
  handle: string;
  pronouns: string;
  status: string;
  bio: string;
  location: string;
  avatar: { kind: AvatarKind; image: string; minecraftName: string };
  banner: { kind: BannerKind; color: string; gradient: string; image: string };
  links: { label: string; url: string }[];
  modrinthUsername: string;
  curseforgeUsername: string;
  githubUsername: string;
  showModrinthStats: boolean;
  showCollections: boolean;
  pinned: SavedProject[];
}

export const DEFAULT_PROFILE: Profile = {
  displayName: "",
  handle: "",
  pronouns: "",
  status: "",
  bio: "",
  location: "",
  avatar: { kind: "initials", image: "", minecraftName: "" },
  banner: { kind: "gradient", color: "#2a1650", gradient: "neptune", image: "" },
  links: [],
  modrinthUsername: "",
  curseforgeUsername: "",
  githubUsername: "",
  showModrinthStats: true,
  showCollections: true,
  pinned: [],
};

export const profileStore = createStore<Profile>("neptune:profile", DEFAULT_PROFILE);

export interface Collection {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  items: SavedProject[];
}

export const collectionsStore = createStore<{ list: Collection[] }>("neptune:collections", { list: [] });

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface PublishDraft {
  repo: string;
  title: string;
  slug: string;
  slugEdited: boolean;
  summary: string;
  type: ContentType;
  loaders: string[];
  gameVersions: string[];
  categories: string[];
  icon: string;
  links: { website: string; discord: string; wiki: string; donate: string };
}

export const DEFAULT_DRAFT: PublishDraft = {
  repo: "",
  title: "",
  slug: "",
  slugEdited: false,
  summary: "",
  type: "mods",
  loaders: [],
  gameVersions: [],
  categories: [],
  icon: "",
  links: { website: "", discord: "", wiki: "", donate: "" },
};

/** Unsent publish form, kept so a refresh doesn't lose it. */
export const draftStore = createStore<PublishDraft>("neptune:publish-draft", DEFAULT_DRAFT);

export type Theme = "dark" | "light" | "system";

export interface Settings {
  theme: Theme;
  accent: string;
  defaultSource: SourceFilter;
  layout: "list" | "grid";
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "#8152d4",
  defaultSource: "all",
  layout: "list",
};

export const settingsStore = createStore<Settings>("neptune:settings", DEFAULT_SETTINGS);

// Builds before the purple theme saved blue as the default accent; move those visitors to the new default.
try {
  const raw = JSON.parse(localStorage.getItem("neptune:settings") || "null");
  if (raw && raw.accent === "#3b82f6" && !localStorage.getItem("neptune:accent-migrated")) {
    settingsStore.set((s) => ({ ...s, accent: DEFAULT_SETTINGS.accent }));
  }
  localStorage.setItem("neptune:accent-migrated", "1");
} catch {
  // Storage unavailable; nothing to migrate.
}
