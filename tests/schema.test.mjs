import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { TYPES, parseSubmission, validateEntry } from "../scripts/registry-schema.mjs";
import { CONTENT } from "../src/lib/content.ts";

const good = {
  slug: "cool-mod",
  title: "Cool Mod",
  summary: "A genuinely cool mod for testing.",
  type: "mods",
  repo: "someone/cool-mod",
  loaders: ["fabric"],
  gameVersions: ["1.21.1"],
  categories: ["utility"],
};

describe("validateEntry", () => {
  test("accepts a complete submission", () => {
    const { errors, entry } = validateEntry(good);
    assert.deepEqual(errors, []);
    assert.equal(entry.slug, "cool-mod");
  });

  test("drops fields that aren't part of the schema", () => {
    const { entry } = validateEntry({ ...good, author: "someone-else", submittedBy: "fake", downloads: 999 });
    assert.equal("author" in entry, false);
    assert.equal("submittedBy" in entry, false);
    assert.equal("downloads" in entry, false);
  });

  test("accepts a full GitHub URL for the repo", () => {
    const { errors, entry } = validateEntry({ ...good, repo: "https://github.com/someone/cool-mod.git" });
    assert.deepEqual(errors, []);
    assert.equal(entry.repo, "someone/cool-mod");
  });

  test("rejects bad slugs, types and repos", () => {
    const { errors } = validateEntry({ ...good, slug: "Bad Slug!", type: "skins", repo: "not a repo" });
    assert.equal(errors.length, 3);
  });

  test("rejects too-short summaries and titles", () => {
    assert.ok(validateEntry({ ...good, summary: "short" }).errors.some((e) => e.startsWith("summary")));
    assert.ok(validateEntry({ ...good, title: "x" }).errors.some((e) => e.startsWith("title")));
  });

  test("rejects unknown loaders and snapshot versions", () => {
    assert.ok(validateEntry({ ...good, loaders: ["notaloader"] }).errors.some((e) => e.startsWith("loaders")));
    assert.ok(validateEntry({ ...good, gameVersions: ["24w10a"] }).errors.some((e) => e.startsWith("gameVersions")));
  });

  test("only allows https links and icons", () => {
    const { errors } = validateEntry({ ...good, icon: "javascript:alert(1)", links: { website: "http://insecure.example" } });
    assert.equal(errors.length, 2);
  });

  test("accepts Bedrock submissions with Bedrock versions and no loaders", () => {
    const { errors } = validateEntry({ ...good, type: "bedrock-addons", loaders: [], gameVersions: ["1.21.40", "26.50"] });
    assert.deepEqual(errors, []);
  });

  test("knows every content type the site shows", () => {
    assert.deepEqual([...TYPES].sort(), Object.keys(CONTENT).sort());
  });

  test("allows at most 3 categories", () => {
    assert.ok(validateEntry({ ...good, categories: ["a", "b", "c", "d"] }).errors.some((e) => e.includes("3 categories")));
  });
});

describe("parseSubmission", () => {
  test("ignores issues that aren't submissions", () => {
    assert.equal(parseSubmission("My game crashes, please help"), null);
  });

  test("reads the JSON block from a submission", () => {
    const body = `<!-- neptune-submission -->\nHi\n\n\`\`\`json\n${JSON.stringify(good)}\n\`\`\``;
    assert.deepEqual(parseSubmission(body).data, good);
  });

  test("reports broken JSON instead of throwing", () => {
    const res = parseSubmission("<!-- neptune-submission -->\n```json\n{ nope\n```");
    assert.match(res.error, /invalid/);
  });
});
