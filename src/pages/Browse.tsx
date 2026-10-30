import { LayoutGrid, List, SearchX, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getCurseForgeCategories } from "../api/curseforge";
import { getModrinthCategories } from "../api/modrinth";
import { getNeptuneCategories } from "../api/neptune";
import { SOURCE_LABELS, gameVersionsFor, searchAll, sourcesFor, type SourceFilter } from "../api/search";
import type { ContentType, SearchParams, SortKey, Source, SourceResult } from "../api/types";
import { ProjectResults, ResultsSkeleton } from "../components/ProjectList";
import { Empty, Notice, Select } from "../components/ui";
import { CONTENT, SORTS, labelize, loaderLabel } from "../lib/content";
import { formatNumber } from "../lib/format";
import { Link, navigate, useRoute, useScrollTopOn } from "../lib/router";
import { settingsStore } from "../lib/store";
import { useAsync } from "../lib/useAsync";

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</h3>
      {children}
    </div>
  );
}

function sourceSummary(name: string, r?: SourceResult) {
  if (!r || r.skipped || r.error) return null;
  return `${name} ${formatNumber(r.total)}${r.capped ? "+" : ""}`;
}

export function Browse({ type }: { type: ContentType }) {
  const { query } = useRoute();
  const settings = settingsStore.use();
  const cfg = CONTENT[type];
  const [showFilters, setShowFilters] = useState(false);

  // Not every site hosts every type, so fall back to "all" if the chosen source doesn't.
  const available = sourcesFor(type);
  const wanted = (query.get("src") as SourceFilter | null) ?? settings.defaultSource;
  const source: SourceFilter = wanted !== "all" && available.includes(wanted) ? wanted : "all";
  const sourceOptions: { value: SourceFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...available.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
  ];
  const params: SearchParams = {
    type,
    query: query.get("q") ?? "",
    gameVersion: query.get("v") ?? "",
    loader: cfg.loaders.includes(query.get("l") ?? "") ? query.get("l")! : "",
    category: source === "all" ? "" : (query.get("c") ?? ""),
    sort: (SORTS.some((s) => s.value === query.get("s")) ? query.get("s") : defaultSort(query.get("q"))) as SortKey,
    page: Math.max(1, Number(query.get("page")) || 1),
  };

  const key = `${type}|${source}|${JSON.stringify(params)}`;
  useScrollTopOn(key);
  const results = useAsync(() => searchAll(params, source), [key]);
  const versions = useAsync(() => gameVersionsFor(cfg.edition), [cfg.edition]);

  // Remember the edition so the header keeps showing its tabs on other pages.
  useEffect(() => {
    if (settingsStore.get().edition !== cfg.edition) settingsStore.set((s) => ({ ...s, edition: cfg.edition }));
  }, [cfg.edition]);
  const categories = useAsync(
    () =>
      source === "modrinth"
        ? getModrinthCategories(type)
        : source === "curseforge"
          ? getCurseForgeCategories(type)
          : source === "neptune"
            ? getNeptuneCategories(type)
            : Promise.resolve([]),
    [type, source],
  );

  const set = (patch: Record<string, string | number | undefined>) => {
    const next: Record<string, string | number | undefined> = { ...Object.fromEntries(query), page: undefined, ...patch };
    navigate(`/browse/${type}`, next);
  };

  const active = params.gameVersion || params.loader || params.category;
  const data = results.data;
  const perSource: [Source, SourceResult | undefined][] = [
    ["neptune", data?.neptune],
    ["modrinth", data?.modrinth],
    ["curseforge", data?.curseforge],
  ];
  const counts = perSource
    // An empty Neptune count on "All" is just noise.
    .filter(([s, r]) => !(s === "neptune" && source === "all" && !r?.total))
    .map(([s, r]) => sourceSummary(SOURCE_LABELS[s], r))
    .filter(Boolean);
  const resultTotal = perSource.reduce((n, [, r]) => n + (r?.total ?? 0), 0);
  const notes = perSource.flatMap(([s, r]): { tone: "info" | "error"; text: string }[] => {
    if (r?.error) return [{ tone: "error", text: `${SOURCE_LABELS[s]} couldn't be reached (${r.error}).` }];
    if (r?.skipped && !(source === "all" && r.skipped.includes("doesn't host"))) return [{ tone: "info", text: r.skipped }];
    return [];
  });

  const filters = (
    <div className="space-y-6">
      {sourceOptions.length > 2 && (
        <FilterGroup title="Source">
          <div className={`grid ${sourceOptions.length === 4 ? "grid-cols-2" : "grid-cols-3"} gap-0.5 rounded-md border border-line bg-surface p-0.5`}>
            {sourceOptions.map((s) => (
              <button
                key={s.value}
                onClick={() => set({ src: s.value, c: undefined })}
                className={`rounded px-1.5 py-1 text-[12px] font-medium transition-colors ${
                  source === s.value ? "bg-surface-2 text-fg shadow-sm" : "text-muted hover:text-fg"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Sort by">
        <Select value={params.sort} onChange={(e) => set({ s: e.target.value })}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </FilterGroup>

      <FilterGroup title="Game version">
        <Select value={params.gameVersion} onChange={(e) => set({ v: e.target.value || undefined })}>
          <option value="">Any version</option>
          {(versions.data ?? []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </FilterGroup>

      {cfg.loaders.length > 0 && (
        <FilterGroup title={type === "plugins" ? "Platform" : type === "shaders" ? "Shader loader" : "Loader"}>
          <div className="flex flex-wrap gap-1.5">
            {["", ...cfg.loaders].map((l) => (
              <button
                key={l || "any"}
                onClick={() => set({ l: l || undefined })}
                className={`h-7 rounded-md border px-2.5 text-[12px] transition-colors ${
                  params.loader === l ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
                }`}
              >
                {l ? loaderLabel(l) : "Any"}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Category">
        {source === "all" ? (
          <p className="text-[12px] text-faint">Each site uses its own categories. Pick one source to filter by category.</p>
        ) : (
          <Select value={params.category} onChange={(e) => set({ c: e.target.value || undefined })} disabled={categories.loading}>
            <option value="">All categories</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {labelize(c.name)}
              </option>
            ))}
          </Select>
        )}
      </FilterGroup>

      {active && (
        <button className="btn w-full" onClick={() => set({ v: undefined, l: undefined, c: undefined })}>
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight">
            {cfg.label}
            {cfg.edition === "bedrock" && <span className="chip h-6 px-2 text-[12px] font-medium text-fg">Bedrock Edition</span>}
          </h1>
          <p className="num mt-1 text-[13px] text-muted min-h-5">
            {results.loading ? "Searching…" : counts.length ? `${counts.join(" · ")} ${resultTotal === 1 ? "result" : "results"}` : ""}
            {params.query && !results.loading && <> for “{params.query}”</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            <SlidersHorizontal size={14} /> Filters{active ? " •" : ""}
          </button>
          <div className="flex rounded-md border border-line bg-surface p-0.5">
            {(["list", "grid"] as const).map((l) => (
              <button
                key={l}
                onClick={() => settingsStore.set((s) => ({ ...s, layout: l }))}
                className={`rounded p-1.5 ${settings.layout === l ? "bg-surface-2 text-fg" : "text-faint hover:text-fg"}`}
                aria-label={`${l} view`}
                aria-pressed={settings.layout === l}
              >
                {l === "list" ? <List size={15} /> : <LayoutGrid size={15} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-32">{filters}</div>
        </aside>

        <section className="min-w-0 space-y-3">
          {notes.map((n) => (
            <Notice key={n.text} tone={n.tone}>
              {n.text}
            </Notice>
          ))}
          {results.loading && !data ? (
            <ResultsSkeleton />
          ) : results.error ? (
            <Empty title="Search failed">{results.error}</Empty>
          ) : !data?.hits.length && source === "neptune" && !active && !params.query ? (
            <Empty title={`No ${cfg.label.toLowerCase()} on Neptune yet`} icon={<SearchX size={28} strokeWidth={1.5} />}>
              Made one?{" "}
              <Link to="/publish" query={{ type }} className="text-accent underline underline-offset-2">
                Publish it on Neptune
              </Link>
              .
            </Empty>
          ) : !data?.hits.length ? (
            <Empty title="Nothing matches these filters" icon={<SearchX size={28} strokeWidth={1.5} />}>
              Try another game version or loader, or clear the filters.
            </Empty>
          ) : (
            <div className={results.loading ? "opacity-60 transition-opacity" : ""}>
              <ProjectResults projects={data.hits} layout={settings.layout} />
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button className="btn" disabled={params.page <= 1} onClick={() => set({ page: params.page - 1 })}>
                Previous
              </button>
              <span className="num text-[13px] text-muted">
                Page {formatNumber(params.page)} of {formatNumber(data.pages)}
              </span>
              <button className="btn" disabled={params.page >= data.pages} onClick={() => set({ page: params.page + 1 })}>
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Relevance only makes sense with a search term; otherwise default to downloads. */
function defaultSort(q: string | null): SortKey {
  return q ? "relevance" : "downloads";
}
