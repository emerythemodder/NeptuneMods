// Runs in the submissions workflow. Reads the GitHub issue event, validates the
// submission and, when the issue is labelled "approved", writes it to the registry.
//
// Never trust the issue body: it is parsed as JSON and validated, never executed.
// Writes results to $GITHUB_OUTPUT: valid, approved, slug, comment (multi-line).

import { readFile, writeFile, appendFile } from "node:fs/promises";
import { parseSubmission, validateEntry } from "./registry-schema.mjs";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const registryPath = process.env.REGISTRY_PATH || "registry/projects.json";
const issue = event.issue;
const submitter = issue.user.login;
const approving = event.action === "labeled" && event.label?.name === "approved";

async function output(key, value) {
  const out = process.env.GITHUB_OUTPUT;
  const line = String(value).includes("\n") ? `${key}<<EOF_NEPTUNE\n${value}\nEOF_NEPTUNE\n` : `${key}=${value}\n`;
  if (out) await appendFile(out, line);
  else process.stdout.write(line);
}

const parsed = parseSubmission(issue.body);
if (!parsed) {
  await output("valid", "false");
  await output("skip", "true");
  process.exit(0);
}

const problems = [];
let entry;
if (parsed.error) problems.push(parsed.error);
else {
  const v = validateEntry(parsed.data);
  entry = v.entry;
  problems.push(...v.errors);
}

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const existing = entry && registry.find((p) => p.slug === entry.slug);
if (existing && existing.submittedBy?.toLowerCase() !== submitter.toLowerCase()) {
  problems.push(`The slug “${entry.slug}” is already taken by another creator.`);
}

const notes = [];
if (entry && entry.repo.split("/")[0].toLowerCase() !== submitter.toLowerCase()) {
  notes.push(`Heads up for the reviewer: the repo owner (${entry.repo.split("/")[0]}) isn't the submitter (${submitter}).`);
}

if (problems.length) {
  await output("valid", "false");
  await output("approved", "false");
  await output("comment", `This submission can't be accepted yet:\n\n${problems.map((p) => `- ${p}`).join("\n")}\n\nEdit the issue to fix it, and it will be checked again.`);
  process.exit(0);
}

await output("valid", "true");
await output("slug", entry.slug);

if (!approving) {
  await output("approved", "false");
  await output(
    "comment",
    [`Thanks, @${submitter}! The submission for **${entry.title}** looks valid.`, ...notes, "", "A maintainer will review it. Once it's labelled `approved`, it goes live on Neptune automatically."].join("\n"),
  );
  process.exit(0);
}

const record = {
  ...entry,
  submittedBy: submitter,
  added: existing?.added ?? new Date().toISOString(),
  issue: issue.number,
};
const next = existing ? registry.map((p) => (p.slug === entry.slug ? record : p)) : [...registry, record];
await writeFile(registryPath, JSON.stringify(next, null, 2) + "\n");

await output("approved", "true");
await output(
  "comment",
  `**${entry.title}** is ${existing ? "updated" : "published"} on Neptune. The site is redeploying now and it will appear within a few minutes.\n\nNew GitHub releases in \`${entry.repo}\` are picked up automatically every few hours.`,
);
