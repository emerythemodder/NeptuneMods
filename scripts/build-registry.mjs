// Builds public/registry.json from registry/projects.json by pulling each project's
// releases, download counts and README from GitHub. Runs before every build, and the
// deploy workflow re-runs it on a schedule so counts and new versions stay current.
//
// Usage: node scripts/build-registry.mjs [registryFile] [outFile]
// Set GITHUB_TOKEN for a higher rate limit (the Pages workflow does this).
// GITHUB_API_URL points it at another server; the tests use this to run offline.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { validateEntry } from "./registry-schema.mjs";
import { gameVersionsIn, primaryAsset } from "./release-utils.mjs";

const [src = "registry/projects.json", out = "public/registry.json"] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN;
const api = process.env.GITHUB_API_URL || "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "neptune-registry",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function gh(path, accept) {
  const res = await fetch(`${api}${path}`, { headers: accept ? { ...headers, Accept: accept } : headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return accept?.includes("raw") ? res.text() : res.json();
}

async function build(entry) {
  const [repo, releases, readme] = await Promise.all([
    gh(`/repos/${entry.repo}`),
    gh(`/repos/${entry.repo}/releases?per_page=50`),
    gh(`/repos/${entry.repo}/readme`, "application/vnd.github.raw+json").catch(() => null),
  ]);
  if (!repo) throw Object.assign(new Error(`repo ${entry.repo} not found`), { notFound: true });

  const versions = (releases ?? [])
    .filter((r) => !r.draft)
    .map((r) => {
      const file = primaryAsset(r.assets);
      return {
        id: String(r.id),
        name: r.name || r.tag_name,
        tag: r.tag_name,
        date: r.published_at,
        channel: r.prerelease ? "beta" : "release",
        downloads: r.assets.reduce((n, a) => n + a.download_count, 0),
        gameVersions: gameVersionsIn(r.name, r.tag_name),
        fileName: file?.name ?? "",
        downloadUrl: file?.browser_download_url ?? null,
        pageUrl: r.html_url,
      };
    });

  return {
    ...entry,
    author: entry.author || repo.owner.login,
    icon: entry.icon || `https://github.com/${repo.owner.login}.png?size=128`,
    downloads: versions.reduce((n, v) => n + v.downloads, 0),
    stars: repo.stargazers_count,
    created: entry.added || repo.created_at,
    updated: versions[0]?.date || repo.pushed_at,
    license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : null,
    issues: repo.has_issues ? `${repo.html_url}/issues` : null,
    defaultBranch: repo.default_branch,
    body: typeof readme === "string" ? readme.slice(0, 60_000) : "",
    versions,
  };
}

const list = JSON.parse(await readFile(src, "utf8"));
const projects = [];
for (const raw of list) {
  const { entry, errors } = validateEntry(raw);
  if (errors.length) {
    console.warn(`skip ${raw.slug}: ${errors.join(" ")}`);
    continue;
  }
  const full = { ...entry, author: raw.author, submittedBy: raw.submittedBy, added: raw.added };
  try {
    projects.push(await build(full));
    console.log(`ok   ${entry.slug} (${entry.repo})`);
  } catch (e) {
    console.warn(`warn ${entry.slug}: ${e.message}`);
    // A deleted repo drops off the site; any other failure keeps the listing without versions.
    if (e.notFound) continue;
    projects.push({ ...full, icon: full.icon || null, downloads: 0, stars: 0, created: full.added, updated: full.added, license: null, versions: [], body: "" });
  }
}

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ generated: new Date().toISOString(), projects }));
console.log(`wrote ${projects.length} project(s) to ${out}`);
