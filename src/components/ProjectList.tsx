import { Download, Heart, RefreshCw, Star } from "lucide-react";
import type { Project } from "../api/types";
import { labelize, loaderLabel } from "../lib/content";
import { formatCompact, formatNumber, timeAgo } from "../lib/format";
import { Link } from "../lib/router";
import type { SavedProject } from "../lib/store";
import { ProjectIcon, Skeleton, SourceTag } from "./ui";

export const projectPath = (p: { source: string; id: string }) => `/project/${p.source}/${encodeURIComponent(p.id)}`;

function Meta({ p }: { p: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
      <span className="num inline-flex items-center gap-1" title={`${formatNumber(p.downloads)} downloads`}>
        <Download size={12} className="text-faint" />
        {formatCompact(p.downloads)}
      </span>
      {p.follows != null && (
        <span className="num inline-flex items-center gap-1" title={`${formatNumber(p.follows)} ${p.source === "neptune" ? "GitHub stars" : "followers"}`}>
          {p.source === "neptune" ? <Star size={12} className="text-faint" /> : <Heart size={12} className="text-faint" />}
          {formatCompact(p.follows)}
        </span>
      )}
      {p.updated && (
        <span className="inline-flex items-center gap-1" title={`Updated ${new Date(p.updated).toLocaleString()}`}>
          <RefreshCw size={11} className="text-faint" />
          {timeAgo(p.updated)}
        </span>
      )}
    </div>
  );
}

function Tags({ p, max = 3 }: { p: Project; max?: number }) {
  const loaders = p.loaders.slice(0, 3);
  const cats = p.categories.slice(0, max);
  if (!loaders.length && !cats.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {loaders.map((l) => (
        <span key={l} className="chip text-fg">
          {loaderLabel(l)}
        </span>
      ))}
      {cats.map((c) => (
        <span key={c} className="chip">
          {labelize(c)}
        </span>
      ))}
    </div>
  );
}

export function ProjectRow({ p }: { p: Project }) {
  return (
    <Link
      to={projectPath(p)}
      className="group flex gap-3.5 px-4 py-3.5 border-b border-line last:border-b-0 hover:bg-surface-2/60 transition-colors"
    >
      <ProjectIcon src={p.icon} alt="" size={56} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="font-semibold text-fg group-hover:text-accent transition-colors">{p.title}</h3>
          <span className="text-[12px] text-muted">by {p.author}</span>
          <SourceTag source={p.source} />
        </div>
        <p className="text-[13px] text-muted line-clamp-2">{p.summary}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <Tags p={p} />
          <Meta p={p} />
        </div>
      </div>
    </Link>
  );
}

export function ProjectCard({ p }: { p: Project }) {
  return (
    <Link to={projectPath(p)} className="group panel flex flex-col gap-3 p-4 hover:border-line-strong transition-colors">
      <div className="flex gap-3">
        <ProjectIcon src={p.icon} alt="" size={44} />
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-fg group-hover:text-accent transition-colors">{p.title}</h3>
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span className="truncate">by {p.author}</span>
            <SourceTag source={p.source} />
          </div>
        </div>
      </div>
      <p className="text-[13px] text-muted line-clamp-2 flex-1">{p.summary}</p>
      <Tags p={p} max={2} />
      <div className="border-t border-line pt-2.5">
        <Meta p={p} />
      </div>
    </Link>
  );
}

export function ProjectResults({ projects, layout }: { projects: Project[]; layout: "list" | "grid" }) {
  if (layout === "grid") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={`${p.source}:${p.id}`} p={p} />
        ))}
      </div>
    );
  }
  return (
    <div className="panel overflow-hidden">
      {projects.map((p) => (
        <ProjectRow key={`${p.source}:${p.id}`} p={p} />
      ))}
    </div>
  );
}

export function ResultsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="panel overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3.5 px-4 py-3.5 border-b border-line last:border-b-0">
          <Skeleton className="h-14 w-14 rounded-md" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Compact tile for saved/pinned projects. */
export function SavedTile({ p, action }: { p: SavedProject; action?: React.ReactNode }) {
  return (
    <div className="panel flex items-center gap-3 p-3">
      <Link to={projectPath(p)} className="flex min-w-0 flex-1 items-center gap-3 group">
        <ProjectIcon src={p.icon} alt="" size={40} />
        <div className="min-w-0">
          <div className="truncate font-medium text-fg group-hover:text-accent transition-colors">{p.title}</div>
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span className="truncate">by {p.author}</span>
            <SourceTag source={p.source} />
          </div>
        </div>
      </Link>
      {action}
    </div>
  );
}
