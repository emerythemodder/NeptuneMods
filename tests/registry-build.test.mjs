// Runs the real registry build against a fake GitHub API, so it works offline.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../scripts/build-registry.mjs", import.meta.url));

const asset = (name, download_count) => ({ name, download_count, browser_download_url: `https://example.test/${name}` });

const FAKE_GITHUB = {
  "/repos/emery/cool-mod": {
    full_name: "emery/cool-mod",
    html_url: "https://github.com/emery/cool-mod",
    owner: { login: "emery" },
    stargazers_count: 42,
    created_at: "2025-01-01T00:00:00Z",
    pushed_at: "2026-10-01T00:00:00Z",
    license: { spdx_id: "MIT" },
    has_issues: true,
    default_branch: "main",
  },
  "/repos/emery/cool-mod/releases?per_page=50": [
    {
      id: 2,
      name: "v1.1.0 for 1.21.1",
      tag_name: "v1.1.0",
      draft: false,
      prerelease: false,
      published_at: "2026-10-01T00:00:00Z",
      html_url: "https://github.com/emery/cool-mod/releases/tag/v1.1.0",
      assets: [asset("cool-mod-1.1.0.jar", 100), asset("cool-mod-1.1.0-sources.jar", 5)],
    },
    {
      id: 1,
      name: "v1.0.0",
      tag_name: "mc1.20.1-1.0.0",
      draft: false,
      prerelease: true,
      published_at: "2026-01-01T00:00:00Z",
      html_url: "https://github.com/emery/cool-mod/releases/tag/mc1.20.1-1.0.0",
      assets: [asset("cool-mod-1.0.0.jar", 20)],
    },
    { id: 3, name: "Unfinished", tag_name: "wip", draft: true, prerelease: false, published_at: null, html_url: "", assets: [] },
  ],
  "/repos/emery/cool-mod/readme": "# Cool Mod\n\n![screenshot](docs/shot.png)",
};

const entry = (over = {}) => ({
  slug: "cool-mod",
  title: "Cool Mod",
  summary: "A genuinely cool mod for testing.",
  type: "mods",
  repo: "emery/cool-mod",
  loaders: ["fabric"],
  gameVersions: ["1.21.1"],
  categories: ["utility"],
  submittedBy: "emery",
  added: "2026-01-01T00:00:00Z",
  ...over,
});

let server;
let apiUrl;

before(async () => {
  server = createServer((req, res) => {
    const body = FAKE_GITHUB[req.url];
    if (body === undefined) {
      res.writeHead(404).end("{}");
      return;
    }
    res.writeHead(200, { "Content-Type": typeof body === "string" ? "text/plain" : "application/json" });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  apiUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function build(projects) {
  const dir = await mkdtemp(join(tmpdir(), "neptune-registry-"));
  const src = join(dir, "projects.json");
  const out = join(dir, "registry.json");
  await writeFile(src, JSON.stringify(projects));
  // No GITHUB_TOKEN, so nothing real is ever sent.
  const env = { ...process.env, GITHUB_API_URL: apiUrl };
  delete env.GITHUB_TOKEN;
  await run(process.execPath, [SCRIPT, src, out], { env });
  return JSON.parse(await readFile(out, "utf8")).projects;
}

describe("registry build", () => {
  test("turns GitHub releases into versions with real download counts", async () => {
    const [p] = await build([entry()]);
    assert.equal(p.versions.length, 2, "draft releases are skipped");
    assert.equal(p.downloads, 125, "sums every attached file");
    assert.equal(p.stars, 42);
    assert.equal(p.license, "MIT");
    assert.match(p.body, /# Cool Mod/);
  });

  test("picks the main jar and each release's game version", async () => {
    const [p] = await build([entry()]);
    const [latest, first] = p.versions;
    assert.equal(latest.fileName, "cool-mod-1.1.0.jar");
    assert.deepEqual(latest.gameVersions, ["1.21.1"]);
    assert.equal(latest.channel, "release");
    assert.deepEqual(first.gameVersions, ["1.20.1"]);
    assert.equal(first.channel, "beta", "pre-releases show as beta");
  });

  test("uses the owner's GitHub avatar when no icon is given", async () => {
    const [p] = await build([entry()]);
    assert.equal(p.icon, "https://github.com/emery.png?size=128");
  });

  test("drops projects whose repo was deleted", async () => {
    const projects = await build([entry(), entry({ slug: "gone", repo: "emery/deleted-repo" })]);
    assert.deepEqual(
      projects.map((p) => p.slug),
      ["cool-mod"],
    );
  });

  test("skips entries that break the rules", async () => {
    const projects = await build([entry(), entry({ slug: "BAD SLUG" })]);
    assert.equal(projects.length, 1);
  });
});
