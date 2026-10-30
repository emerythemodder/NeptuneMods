import { ArrowLeft, Download, ExternalLink, ImageOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SOURCE_LABELS, getProject, getVersions } from "../api/search";
import type { ProjectDetail, ProjectVersion, Source } from "../api/types";
import { PinButton, SaveMenu } from "../components/SaveMenu";
import { Empty, Notice, ProjectIcon, Select, Skeleton, SourceTag } from "../components/ui";
import { CONTENT, labelize, loaderLabel } from "../lib/content";
import { formatCompact, formatDate, formatNumber, timeAgo } from "../lib/format";
import { Link, navigate, useRoute, useScrollTopOn } from "../lib/router";
import { useAsync } from "../lib/useAsync";
import { releasesDesc } from "../lib/versions";

const TABS = ["overview", "versions", "gallery"] as const;
type Tab = (typeof TABS)[number];

export function ProjectPage({ source, id }: { source: Source; id: string }) {
  const { query } = useRoute();
  const tab: Tab = (TABS as readonly string[]).includes(query.get("tab") ?? "") ? (query.get("tab") as Tab) : "overview";
  useScrollTopOn(`${source}/${id}`);
  const project = useAsync(() => getProject(source, id), [source, id]);
  const title = project.data?.title;
  useEffect(() => {
    if (title) document.title = `${title} · Neptune`;
  }, [title]);

  if (project.loading) return <ProjectSkeleton />;
  if (project.error || !project.data) {
    return (
      <Empty title="Couldn't load this project">
        {project.error} <br />
        <Link to="/" className="text-accent underline">
          Back to home
        </Link>
      </Empty>
    );
  }
  const p = project.data;
  const setTab = (t: Tab) => navigate(`/project/${source}/${encodeURIComponent(id)}`, { tab: t === "overview" ? undefined : t }, true);
  const versions = releasesDesc(p.gameVersions);

  return (
    <div>
      <button onClick={() => (history.length > 1 ? history.back() : navigate("/"))} className="btn btn-ghost -ml-2 mb-4">
        <ArrowLeft size={14} /> Back
      </button>

      <header className="flex flex-col gap-5 sm:flex-row">
        <ProjectIcon src={p.icon} alt="" size={88} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{p.title}</h1>
            <SourceTag source={p.source} />
          </div>
          <p className="mt-1 text-[13px] text-muted">
            by <span className="text-fg">{p.author}</span> · {CONTENT[p.type].singular}
          </p>
          <p className="mt-3 max-w-2xl text-muted">{p.summary}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            <HeaderStat label="Downloads" value={formatCompact(p.downloads)} title={formatNumber(p.downloads)} />
            {p.follows != null && (
              <HeaderStat label={p.source === "neptune" ? "GitHub stars" : "Followers"} value={formatCompact(p.follows)} title={formatNumber(p.follows)} />
            )}
            <HeaderStat label="Updated" value={timeAgo(p.updated)} title={formatDate(p.updated)} />
            <HeaderStat label="Created" value={formatDate(p.created)} />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col sm:items-stretch">
          <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-primary">
            Open on {p.source === "neptune" ? "GitHub" : SOURCE_LABELS[p.source]} <ExternalLink size={13} />
          </a>
          <div className="flex gap-2">
            <SaveMenu project={p} />
            <PinButton project={p} />
          </div>
        </div>
      </header>

      <div className="mt-8 border-b border-line">
        <nav className="scroll-x -mb-px flex gap-1 overflow-x-auto">
          {TABS.filter((t) => t !== "gallery" || p.source !== "neptune").map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] capitalize transition-colors ${
                tab === t ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {t}
              {t === "gallery" && p.gallery.length > 0 && <span className="num ml-1.5 text-faint">{p.gallery.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          {tab === "overview" &&
            (p.bodyHtml ? (
              <article className="prose-body" dangerouslySetInnerHTML={{ __html: p.bodyHtml }} />
            ) : (
              <p className="text-muted">{p.summary}</p>
            ))}
          {tab === "versions" && <Versions project={p} />}
          {tab === "gallery" && <Gallery project={p} />}
        </div>

        <aside className="space-y-6 text-[13px]">
          {(p.loaders.length > 0 || versions.length > 0) && (
            <Side title="Compatibility">
              {p.loaders.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.loaders.map((l) => (
                    <span key={l} className="chip text-fg">
                      {loaderLabel(l)}
                    </span>
                  ))}
                </div>
              )}
              {versions.length > 0 && (
                <p className="text-muted">
                  {versions.length === 1 ? versions[0] : `${versions[versions.length - 1]} – ${versions[0]}`}
                  <span className="text-faint"> · {versions.length} release{versions.length === 1 ? "" : "s"}</span>
                </p>
              )}
            </Side>
          )}
          {p.categories.length > 0 && (
            <Side title="Categories">
              <div className="flex flex-wrap gap-1">
                {p.categories.map((c) => (
                  <span key={c} className="chip">
                    {labelize(c)}
                  </span>
                ))}
              </div>
            </Side>
          )}
          <Side title="Links">
            <ul className="space-y-1.5">
              {p.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-accent">
                    {l.label} <ExternalLink size={11} />
                  </a>
                </li>
              ))}
            </ul>
          </Side>
          {p.license && (
            <Side title="License">
              <p className="text-muted">{p.license}</p>
            </Side>
          )}
        </aside>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <div className="num font-semibold text-fg">{value}</div>
      <div className="text-[12px] text-faint">{label}</div>
    </div>
  );
}

function Side({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</h3>
      {children}
    </section>
  );
}

function Versions({ project }: { project: ProjectDetail }) {
  const versions = useAsync(() => getVersions(project), [project.source, project.id]);
  const [gv, setGv] = useState("");
  const [loader, setLoader] = useState("");
  const all = versions.data ?? [];
  const gvOptions = useMemo(() => releasesDesc(all.flatMap((v) => v.gameVersions)), [all]);
  const loaderOptions = useMemo(() => [...new Set(all.flatMap((v) => v.loaders))].sort(), [all]);
  const shown = all.filter((v) => (!gv || v.gameVersions.includes(gv)) && (!loader || v.loaders.includes(loader)));

  if (versions.loading) return <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (versions.error) return <Notice tone="error">Couldn't load versions: {versions.error}</Notice>;
  if (!all.length) return <Empty title="No files published" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {gvOptions.length > 0 && (
          <Select value={gv} onChange={(e) => setGv(e.target.value)} className="w-40">
            <option value="">All game versions</option>
            {gvOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Select>
        )}
        {loaderOptions.length > 1 && (
          <Select value={loader} onChange={(e) => setLoader(e.target.value)} className="w-36">
            <option value="">All loaders</option>
            {loaderOptions.map((l) => (
              <option key={l} value={l}>
                {loaderLabel(l)}
              </option>
            ))}
          </Select>
        )}
        <span className="num text-[12px] text-faint">
          {shown.length} of {all.length}
          {project.source === "curseforge" && all.length >= 50 ? " most recent" : ""}
        </span>
      </div>
      {shown.length === 0 ? (
        <Empty title="No files for that combination" />
      ) : (
        <div className="panel divide-y divide-line">
          {shown.map((v) => (
            <VersionRow key={v.id} v={v} source={project.source} />
          ))}
        </div>
      )}
    </div>
  );
}

const CHANNEL_STYLE: Record<ProjectVersion["channel"], string> = {
  release: "text-emerald-500 border-emerald-500/30",
  beta: "text-amber-500 border-amber-500/30",
  alpha: "text-red-400 border-red-400/30",
};

function VersionRow({ v, source }: { v: ProjectVersion; source: Source }) {
  const gvs = releasesDesc(v.gameVersions);
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`chip bg-transparent capitalize ${CHANNEL_STYLE[v.channel]}`}>{v.channel}</span>
          <span className="truncate font-medium text-fg">{v.name}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
          {v.loaders.length > 0 && <span>{v.loaders.map(loaderLabel).join(", ")}</span>}
          {gvs.length > 0 && <span>{gvs.length > 4 ? `${gvs.slice(0, 4).join(", ")} +${gvs.length - 4}` : gvs.join(", ")}</span>}
          <span title={formatDate(v.date)}>{timeAgo(v.date)}</span>
          <span className="num">{formatCompact(v.downloads)} downloads</span>
        </div>
      </div>
      {v.downloadUrl ? (
        <a href={v.downloadUrl} className="btn" title={v.fileName}>
          <Download size={14} /> Download
        </a>
      ) : (
        <a
          href={v.pageUrl}
          target="_blank"
          rel="noreferrer"
          className="btn"
          title={source === "curseforge" ? "The author only allows downloads from CurseForge" : "This release has no attached file"}
        >
          {source === "curseforge" ? "Get on CurseForge" : "View release"} <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

function Gallery({ project }: { project: ProjectDetail }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i == null ? i : (i + 1) % project.gallery.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i == null ? i : (i - 1 + project.gallery.length) % project.gallery.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, project.gallery.length]);

  if (!project.gallery.length) {
    return <Empty title="No screenshots" icon={<ImageOff size={26} strokeWidth={1.5} />}>This project hasn't uploaded any images.</Empty>;
  }
  const img = open != null ? project.gallery[open] : null;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {project.gallery.map((g, i) => (
          <button key={g.url} onClick={() => setOpen(i)} className="group panel overflow-hidden text-left">
            <div className="aspect-video bg-surface-2">
              <img src={g.thumb} alt={g.title} loading="lazy" className="h-full w-full object-cover" />
            </div>
            {(g.title || g.description) && (
              <div className="px-3 py-2">
                {g.title && <div className="truncate text-[13px] font-medium text-fg">{g.title}</div>}
                {g.description && <div className="truncate text-[12px] text-muted">{g.description}</div>}
              </div>
            )}
          </button>
        ))}
      </div>
      {img && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(null)}>
          <button className="absolute right-4 top-4 text-white/80 hover:text-white" aria-label="Close">
            <X size={22} />
          </button>
          <figure className="max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={img.url} alt={img.title} className="max-h-[82vh] w-auto rounded-md object-contain" />
            {img.title && <figcaption className="mt-2 text-center text-[13px] text-white/80">{img.title}</figcaption>}
          </figure>
        </div>
      )}
    </>
  );
}

function ProjectSkeleton() {
  return (
    <div className="space-y-6 pt-12">
      <div className="flex gap-5">
        <Skeleton className="h-[88px] w-[88px] rounded-md" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-3.5 w-1/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
