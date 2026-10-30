import { ArrowRight, Download, Search, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getModrinthStats } from "../api/modrinth";
import { loadRegistry, toProject } from "../api/neptune";
import { searchAll } from "../api/search";
import type { ContentType, SortKey } from "../api/types";
import { ProjectRow, ResultsSkeleton } from "../components/ProjectList";
import { Notice } from "../components/ui";
import { CONTENT, EDITIONS, typesFor } from "../lib/content";
import { formatNumber } from "../lib/format";
import { Link, navigate } from "../lib/router";
import { useAsync } from "../lib/useAsync";

function Shelf({ title, type, sort }: { title: string; type: ContentType; sort: SortKey }) {
  const res = useAsync(
    () => searchAll({ type, sort, query: "", gameVersion: "", loader: "", category: "", page: 1 }, "all"),
    [type, sort],
  );
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <Link to={`/browse/${type}`} query={{ s: sort }} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-accent">
          See all <ArrowRight size={13} />
        </Link>
      </div>
      {res.loading ? (
        <ResultsSkeleton rows={4} />
      ) : res.error || !res.data?.hits.length ? (
        <Notice tone="error">Couldn't load {CONTENT[type].label.toLowerCase()} right now.</Notice>
      ) : (
        <div className="panel overflow-hidden">
          {res.data.hits.slice(0, 4).map((p) => (
            <ProjectRow key={`${p.source}:${p.id}`} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function NeptuneShelf() {
  const res = useAsync(loadRegistry, []);
  if (res.loading) return null;
  const latest = [...(res.data ?? [])].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, 4);
  if (!latest.length) {
    return (
      <section className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-[15px] font-semibold">Publish on Neptune</h2>
          <p className="mt-1 max-w-xl text-[13px] text-muted">
            Host your mod's files as GitHub Releases and list them here, next to Modrinth and CurseForge. New releases show up automatically.
          </p>
        </div>
        <Link to="/publish" className="btn btn-primary">
          <Upload size={14} /> Publish a project
        </Link>
      </section>
    );
  }
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">New on Neptune</h2>
        <Link to="/browse/mods" query={{ src: "neptune", s: "newest" }} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-accent">
          See all <ArrowRight size={13} />
        </Link>
      </div>
      <div className="panel overflow-hidden">
        {latest.map((r) => (
          <ProjectRow key={r.slug} p={toProject(r)} />
        ))}
      </div>
    </section>
  );
}

export function Home() {
  const [q, setQ] = useState("");
  const stats = useAsync(getModrinthStats, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/browse/mods", { q: q.trim() });
  };

  return (
    <div className="space-y-12">
      <section className="pt-2 sm:pt-6">
        <div className="flex items-center gap-10">
          <div className="min-w-0 flex-1">
            <h1 className="max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
              Search Neptune, Modrinth and CurseForge in one place.
            </h1>
            <p className="mt-3 max-w-xl text-muted">
              Java mods, modpacks and shaders, and Bedrock add-ons, maps and skins. Filter by game version and loader, save what
              you find to collections, and pin favourites to your profile.
            </p>
            <form onSubmit={submit} className="mt-6 flex max-w-xl gap-2">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Try “sodium” or “create”"
                  className="input h-10 pl-9 text-[14px]"
                  aria-label="Search mods"
                />
              </div>
              <button className="btn btn-primary h-10 px-4">Search</button>
            </form>
            <div className="mt-4 space-y-1.5">
              {EDITIONS.map((e) => (
                <div key={e.value} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-16 text-[11px] font-semibold uppercase tracking-wider text-faint">{e.label}</span>
                  {typesFor(e.value).map((t) => (
                    <Link key={t} to={`/browse/${t}`} className="chip h-7 px-2.5 text-[12px] hover:text-fg hover:border-line-strong">
                      {CONTENT[t].label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <img
            src="./planet.webp"
            alt=""
            width={240}
            height={240}
            className="hidden md:block shrink-0 drop-shadow-[0_20px_60px_rgba(129,82,212,0.35)]"
          />
        </div>

        {stats.data && (
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-5">
            {(
              [
                ["Projects on Modrinth", stats.data.projects],
                ["Authors", stats.data.authors],
                ["Versions published", stats.data.versions],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dd className="num text-[20px] font-semibold">{formatNumber(value)}</dd>
                <dt className="text-[12px] text-muted">{label}</dt>
              </div>
            ))}
            <p className="self-end text-[11px] text-faint">Live from the Modrinth API</p>
          </dl>
        )}
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-[15px] font-semibold">Neptune Launcher for Windows</h2>
          <p className="mt-1 max-w-xl text-[13px] text-muted">
            Install mods from here in one click, run Fabric, Quilt, Forge and NeoForge instances, and sign in with Microsoft.
          </p>
        </div>
        <Link to="/download" className="btn btn-primary">
          <Download size={14} /> Get the launcher
        </Link>
      </section>

      <NeptuneShelf />

      <div className="grid gap-10 lg:grid-cols-2">
        <Shelf title="Most downloaded mods" type="mods" sort="downloads" />
        <Shelf title="Recently updated modpacks" type="modpacks" sort="updated" />
        <Shelf title="Popular shaders" type="shaders" sort="downloads" />
        <Shelf title="Popular Bedrock add-ons" type="bedrock-addons" sort="downloads" />
      </div>
    </div>
  );
}
