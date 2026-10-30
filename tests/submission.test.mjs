// Runs the real submissions-workflow script against fake GitHub issue events.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../scripts/handle-submission.mjs", import.meta.url));

const entry = {
  slug: "cool-mod",
  title: "Cool Mod",
  summary: "A genuinely cool mod for testing.",
  type: "mods",
  repo: "emery/cool-mod",
  loaders: ["fabric"],
  gameVersions: ["1.21.1"],
  categories: ["utility"],
};

const bodyFor = (json) => `<!-- neptune-submission -->\nSubmitted from Neptune\n\n\`\`\`json\n${json}\n\`\`\``;

/** Simulate one workflow run. Returns the step outputs and the registry afterwards. */
async function simulate({ action = "opened", label, user = "emery", body, registry = [] }) {
  const dir = await mkdtemp(join(tmpdir(), "neptune-test-"));
  const paths = { event: join(dir, "event.json"), registry: join(dir, "projects.json"), output: join(dir, "output.txt") };
  await writeFile(paths.event, JSON.stringify({ action, label: label && { name: label }, issue: { number: 1, user: { login: user }, body } }));
  await writeFile(paths.registry, JSON.stringify(registry));
  await writeFile(paths.output, "");
  await run(process.execPath, [SCRIPT], {
    env: { ...process.env, GITHUB_EVENT_PATH: paths.event, REGISTRY_PATH: paths.registry, GITHUB_OUTPUT: paths.output },
  });
  const raw = await readFile(paths.output, "utf8");
  const out = {};
  for (const m of raw.matchAll(/^(\w+)<<EOF_NEPTUNE\n([\s\S]*?)\nEOF_NEPTUNE$|^(\w+)=(.*)$/gm)) {
    if (m[1]) out[m[1]] = m[2];
    else out[m[3]] = m[4];
  }
  return { out, registry: JSON.parse(await readFile(paths.registry, "utf8")) };
}

describe("submissions workflow", () => {
  test("ignores ordinary issues", async () => {
    const { out } = await simulate({ body: "The site is down for me" });
    assert.equal(out.skip, "true");
  });

  test("a valid new submission gets a thank-you and waits for approval", async () => {
    const { out, registry } = await simulate({ body: bodyFor(JSON.stringify(entry)) });
    assert.equal(out.valid, "true");
    assert.equal(out.approved, "false");
    assert.match(out.comment, /looks valid/);
    assert.equal(registry.length, 0, "nothing is published before approval");
  });

  test("an invalid submission lists what to fix", async () => {
    const { out } = await simulate({ body: bodyFor(JSON.stringify({ ...entry, slug: "NO!", summary: "short" })) });
    assert.equal(out.valid, "false");
    assert.match(out.comment, /slug/);
    assert.match(out.comment, /summary/);
  });

  test("broken JSON is reported, not crashed on", async () => {
    const { out } = await simulate({ body: bodyFor("{ oops") });
    assert.equal(out.valid, "false");
    assert.match(out.comment, /JSON block is invalid/);
  });

  test("the approved label publishes it, with the submitter taken from GitHub", async () => {
    const { out, registry } = await simulate({
      action: "labeled",
      label: "approved",
      user: "emery",
      body: bodyFor(JSON.stringify({ ...entry, submittedBy: "someone-else" })),
    });
    assert.equal(out.approved, "true");
    assert.equal(registry.length, 1);
    assert.equal(registry[0].slug, "cool-mod");
    assert.equal(registry[0].submittedBy, "emery");
  });

  test("other labels don't publish anything", async () => {
    const { out, registry } = await simulate({ action: "labeled", label: "question", body: bodyFor(JSON.stringify(entry)) });
    assert.equal(out.approved, "false");
    assert.equal(registry.length, 0);
  });

  test("nobody can take over another creator's project", async () => {
    const existing = [{ ...entry, submittedBy: "original-author", added: "2026-01-01T00:00:00Z" }];
    const { out, registry } = await simulate({
      action: "labeled",
      label: "approved",
      user: "intruder",
      body: bodyFor(JSON.stringify({ ...entry, title: "Hijacked" })),
      registry: existing,
    });
    assert.equal(out.valid, "false");
    assert.match(out.comment, /already taken/);
    assert.equal(registry[0].title, "Cool Mod");
  });

  test("the original creator can update their own listing", async () => {
    const existing = [{ ...entry, submittedBy: "emery", added: "2026-01-01T00:00:00Z" }];
    const { out, registry } = await simulate({
      action: "labeled",
      label: "approved",
      user: "emery",
      body: bodyFor(JSON.stringify({ ...entry, summary: "An updated summary for testing." })),
      registry: existing,
    });
    assert.equal(out.approved, "true");
    assert.equal(registry.length, 1);
    assert.equal(registry[0].summary, "An updated summary for testing.");
    assert.equal(registry[0].added, "2026-01-01T00:00:00Z", "keeps the original publish date");
  });
});
