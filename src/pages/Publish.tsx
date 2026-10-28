import { Check, CircleAlert, Copy, ExternalLink, GitBranch, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { validateEntry } from "../../scripts/registry-schema.mjs";
import { getGameVersions } from "../api/modrinth";
import { getNeptuneCategories } from "../api/neptune";
import type { ContentType, Project } from "../api/types";
import { NEPTUNE_REPO } from "../config";
import { Field, Section } from "../components/form";
import { ProjectRow } from "../components/ProjectList";
import { Notice, PageHeader, Select } from "../components/ui";
import { CONTENT, CONTENT_TYPES, labelize, loaderLabel } from "../lib/content";
import { formatDate } from "../lib/format";
import { useRoute } from "../lib/router";
import { DEFAULT_DRAFT, draftStore, profileStore, type PublishDraft } from "../lib/store";
import { useAsync } from "../lib/useAsync";

interface RepoCheck {
  state: "idle" | "checking" | "ok" | "error";
  message?: string;
  owner?: string;
  releases?: number;
  latest?: { name: string; date: string; file: string | null };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 41);

const normaliseRepo = (s: string) =>
  s
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$|\/+$/g, "");

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 rounded-md border px-2.5 text-[12px] transition-colors disabled:opacity-40 ${
        on ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function toggle(list: string[], v: string, max = Infinity) {
  return list.includes(v) ? list.filter((x) => x !== v) : list.length < max ? [...list, v] : list;
}

function submissionBody(d: PublishDraft, entry: ReturnType<typeof validateEntry>["entry"]) {
  return [
    "<!-- neptune-submission -->",
    `**Project:** ${entry.title}`,
    `**Repository:** https://github.com/${entry.repo}`,
    `**Type:** ${CONTENT[d.type].singular}`,
    "",
    `> ${entry.summary}`,
    "",
    "Submitted from the Neptune publish page. Only edit the JSON below to fix a mistake.",
    "",
    "```json",
    JSON.stringify(entry, null, 2),
    "```",
  ].join("\n");
}

export function Publish() {
  const draft = draftStore.use();
  const profile = profileStore.use();
  const { query } = useRoute();
  const [check, setCheck] = useState<RepoCheck>({ state: "idle" });
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [versionFilter, setVersionFilter] = useState("");
  const [submitted, setSubmitted] = useState<"opened" | "copied" | null>(null);
  const [touched, setTouched] = useState(false);

  // Always derive from the latest draft so quick successive clicks don't overwrite each other.
  const set = (patch: Partial<PublishDraft> | ((d: PublishDraft) => Partial<PublishDraft>)) =>
    draftStore.set((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));

  useEffect(() => {
    const t = query.get("type");
    if (t && t in CONTENT && !draft.title) set({ type: t as ContentType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const versions = useAsync(getGameVersions, []);
  const categories = useAsync(() => getNeptuneCategories(draft.type), [draft.type]);
  const cfg = CONTENT[draft.type];

  const { entry, errors } = validateEntry({ ...draft, repo: normaliseRepo(draft.repo) });

  const checkRepo = async () => {
    const repo = normaliseRepo(draft.repo);
    if (!/^[\w-]+\/[\w.-]+$/.test(repo)) {
      setCheck({ state: "error", message: "Enter the repo as owner/name, or paste its GitHub URL." });
      return;
    }
    setCheck({ state: "checking" });
    try {
      const [r, rel] = await Promise.all([
        fetch(`https://api.github.com/repos/${repo}`),
        fetch(`https://api.github.com/repos/${repo}/releases?per_page=5`),
      ]);
      if (r.status === 404) return setCheck({ state: "error", message: "That repository doesn't exist or isn't public." });
      if (r.status === 403) return setCheck({ state: "error", message: "GitHub's rate limit was hit. Wait a few minutes and try again." });
      if (!r.ok) return setCheck({ state: "error", message: `GitHub responded ${r.status}.` });
      const info = await r.json();
      const releases: { name: string; tag_name: string; published_at: string; draft: boolean; assets: { name: string }[] }[] = rel.ok ? await rel.json() : [];
      const published = releases.filter((x) => !x.draft);
      const latest = published[0];
      set({
        repo: info.full_name,
        title: draft.title || info.name.replace(/[-_]/g, " "),
        summary: draft.summary || (info.description ?? "").slice(0, 200),
        slug: draft.slugEdited ? draft.slug : slugify(draft.title || info.name),
        links: { ...draft.links, website: draft.links.website || (info.homepage?.startsWith("https://") ? info.homepage : "") },
      });
      setCheck({
        state: "ok",
        owner: info.owner.login,
        releases: published.length,
        latest: latest && {
          name: latest.name || latest.tag_name,
          date: latest.published_at,
          file: latest.assets.find((a) => /\.(jar|zip|mrpack)$/i.test(a.name))?.name ?? null,
        },
      });
    } catch {
      setCheck({ state: "error", message: "Couldn't reach GitHub. Check your connection." });
    }
  };

  const preview: Project = {
    source: "neptune",
    id: entry.slug || "preview",
    slug: entry.slug,
    title: entry.title || "Your project",
    summary: entry.summary || "A short summary of what your project does.",
    icon: entry.icon || (check.owner ? `https://github.com/${check.owner}.png?size=128` : null),
    author: check.owner || profile.githubUsername || "you",
    downloads: 0,
    follows: null,
    updated: "",
    created: "",
    categories: entry.categories,
    loaders: entry.loaders,
    gameVersions: entry.gameVersions,
    url: "",
    type: draft.type,
  };

  const body = submissionBody(draft, entry);
  const issueUrl = NEPTUNE_REPO
    ? `https://github.com/${NEPTUNE_REPO}/issues/new?${new URLSearchParams({ title: `[Neptune] ${entry.title}`, body })}`
    : null;

  const submit = () => {
    setTouched(true);
    if (errors.length) return;
    if (issueUrl) {
      window.open(issueUrl, "_blank", "noopener");
      setSubmitted("opened");
    }
  };

  const copy = async () => {
    setTouched(true);
    if (errors.length) return;
    await navigator.clipboard.writeText(body);
    setSubmitted("copied");
  };

  const allVersions = versions.data ?? [];
  const filtered = allVersions.filter((v) => v.startsWith(versionFilter.trim()));
  const shownVersions = showAllVersions || versionFilter ? filtered : filtered.slice(0, 24);

  return (
    <div>
      <PageHeader
        title="Publish on Neptune"
        subtitle="Host your files as GitHub Releases, then list them here. New releases show up automatically."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Section id="repo" title="1. GitHub repository" hint="Neptune lists the releases in a public GitHub repo. Attach your .jar, .zip or .mrpack to each release.">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <GitBranch size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="input pl-8"
                  placeholder="owner/repo or https://github.com/owner/repo"
                  value={draft.repo}
                  onChange={(e) => {
                    set({ repo: e.target.value });
                    setCheck({ state: "idle" });
                  }}
                  onBlur={() => draft.repo && check.state === "idle" && checkRepo()}
                />
              </div>
              <button type="button" className="btn" onClick={checkRepo} disabled={!draft.repo || check.state === "checking"}>
                {check.state === "checking" ? "Checking…" : "Check"}
              </button>
            </div>
            {check.state === "error" && <Notice tone="error">{check.message}</Notice>}
            {check.state === "ok" && (
              <div className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px]">
                <div className="flex items-center gap-1.5 text-fg">
                  <Check size={14} className="text-emerald-500" /> Found {draft.repo}
                </div>
                {check.releases ? (
                  <p className="mt-1 text-muted">
                    {check.releases}
                    {check.releases === 5 ? "+" : ""} release{check.releases === 1 ? "" : "s"}. Latest: {check.latest?.name} ({formatDate(check.latest!.date)})
                    {check.latest?.file ? ` with ${check.latest.file}` : ", but it has no .jar/.zip/.mrpack attached"}.
                  </p>
                ) : (
                  <p className="mt-1 flex items-start gap-1.5 text-amber-500">
                    <CircleAlert size={14} className="mt-0.5 shrink-0" />
                    No releases yet. You can still submit, but people won't have anything to download until you publish a release with your file attached.
                  </p>
                )}
                {profile.githubUsername && check.owner && check.owner.toLowerCase() !== profile.githubUsername.toLowerCase() && (
                  <p className="mt-1 text-faint">Submissions are checked against the GitHub account you submit from, so use the account that owns this repo.</p>
                )}
              </div>
            )}
          </Section>

          <Section id="details" title="2. Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  className="input"
                  value={draft.title}
                  maxLength={60}
                  onChange={(e) => set({ title: e.target.value, slug: draft.slugEdited ? draft.slug : slugify(e.target.value) })}
                />
              </Field>
              <Field label="URL name" hint={entry.slug ? `${location.host}${location.pathname}#/project/neptune/${entry.slug}` : "Lowercase letters, numbers and dashes."}>
                <input
                  className="input font-mono text-[12px]"
                  value={draft.slug}
                  maxLength={41}
                  onChange={(e) => set({ slug: slugify(e.target.value), slugEdited: true })}
                />
              </Field>
            </div>
            <Field label="Summary" hint={`${draft.summary.length}/200. Shown in search results.`}>
              <textarea className="input" rows={2} maxLength={200} value={draft.summary} onChange={(e) => set({ summary: e.target.value })} />
            </Field>
            <Field label="Type">
              <Select
                value={draft.type}
                onChange={(e) => set({ type: e.target.value as ContentType, loaders: [], categories: [] })}
                className="max-w-xs"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CONTENT[t].label}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-[12px] text-faint">The long description comes from your repo's README.</p>
          </Section>

          <Section id="compat" title="3. Compatibility">
            {cfg.loaders.length > 0 && (
              <div>
                <span className="label">{draft.type === "plugins" ? "Platforms" : "Loaders"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {cfg.loaders.map((l) => (
                    <Chip key={l} on={draft.loaders.includes(l)} onClick={() => set((d) => ({ loaders: toggle(d.loaders, l) }))}>
                      {loaderLabel(l)}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="label mb-0">
                  Game versions {draft.gameVersions.length > 0 && <span className="text-faint">· {draft.gameVersions.length} selected</span>}
                </span>
                <input
                  className="input h-7 w-32 text-[12px]"
                  placeholder="Filter, e.g. 1.20"
                  value={versionFilter}
                  onChange={(e) => setVersionFilter(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {shownVersions.map((v) => (
                  <Chip key={v} on={draft.gameVersions.includes(v)} onClick={() => set((d) => ({ gameVersions: toggle(d.gameVersions, v, 80) }))}>
                    {v}
                  </Chip>
                ))}
                {!showAllVersions && !versionFilter && filtered.length > 24 && (
                  <button type="button" className="btn btn-ghost h-7" onClick={() => setShowAllVersions(true)}>
                    Show all {filtered.length}
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="label">
                Categories <span className="text-faint">· up to 3</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(categories.data ?? []).map((c) => (
                  <Chip
                    key={c.id}
                    on={draft.categories.includes(c.id)}
                    disabled={!draft.categories.includes(c.id) && draft.categories.length >= 3}
                    onClick={() => set((d) => ({ categories: toggle(d.categories, c.id, 3) }))}
                  >
                    {labelize(c.name)}
                  </Chip>
                ))}
              </div>
            </div>
          </Section>

          <Section id="links" title="4. Icon and links" hint="All optional. Without an icon, your GitHub avatar is used.">
            <Field label="Icon URL">
              <input className="input" placeholder="https://…/icon.png" value={draft.icon} onChange={(e) => set({ icon: e.target.value.trim() })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["website", "discord", "wiki", "donate"] as const).map((k) => (
                <Field key={k} label={labelize(k)}>
                  <input
                    className="input"
                    placeholder="https://"
                    value={draft.links[k]}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      set((d) => ({ links: { ...d.links, [k]: value } }));
                    }}
                  />
                </Field>
              ))}
            </div>
          </Section>
        </div>

        <aside>
          <div className="space-y-4 lg:sticky lg:top-32">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Preview</p>
              <div className="panel pointer-events-none overflow-hidden">
                <ProjectRow p={preview} />
              </div>
            </div>

            {touched && errors.length > 0 && (
              <Notice tone="error">
                <ul className="space-y-0.5">
                  {errors.map((e) => (
                    <li key={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</li>
                  ))}
                </ul>
              </Notice>
            )}

            {submitted === "opened" ? (
              <div className="panel space-y-2 p-4 text-[13px]">
                <p className="font-medium">Almost done</p>
                <p className="text-muted">
                  GitHub opened in a new tab with your submission filled in. Sign in if needed and press <b>Submit new issue</b>. You'll get a
                  comment there when it's checked and approved.
                </p>
                <div className="flex gap-2 pt-1">
                  {issueUrl && (
                    <a href={issueUrl} target="_blank" rel="noreferrer" className="btn">
                      Open again <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      draftStore.set(DEFAULT_DRAFT);
                      setSubmitted(null);
                      setTouched(false);
                      setCheck({ state: "idle" });
                    }}
                  >
                    Start another
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel space-y-3 p-4">
                <p className="text-[13px] text-muted">
                  Submitting opens a pre-filled issue on GitHub. Once a maintainer approves it, your project goes live here within minutes.
                </p>
                {issueUrl ? (
                  <button className="btn btn-primary w-full" onClick={submit}>
                    <Send size={14} /> Submit on GitHub
                  </button>
                ) : (
                  <Notice>This copy of Neptune doesn't know its GitHub repo, so copy the submission and open an issue on the site's repo yourself.</Notice>
                )}
                <button className="btn w-full" onClick={copy}>
                  <Copy size={14} /> {submitted === "copied" ? "Copied" : "Copy submission text"}
                </button>
                <p className="text-[11px] text-faint">Your draft is saved in this browser until you submit.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
