#!/usr/bin/env node
// auto-runner.mjs — the only framework code. ~60 LOC.
// Reads the GitHub event, emits a trigger fact, loads the engine lifecycle,
// picks the matching step, dispatches to the declared agent, records the
// resulting fact, and posts the side effect (PR comment).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUTO = join(ROOT, ".auto");
const FACTS = join(AUTO, "facts");
mkdirSync(FACTS, { recursive: true });

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
if (event.action !== "opened" || !event.pull_request) {
  console.log("Not a PR-opened event; exiting."); process.exit(0);
}

const trigger = makeFact("github-webhook", "PROpened", {
  author: event.pull_request.user.login,
  pr_number: event.pull_request.number,
});
appendFact(trigger);

const engine = yaml.load(readFileSync(join(AUTO, "engines", "pr-greeter", "lifecycle.yaml"), "utf8"));
if (engine.on.kind !== trigger.kind) process.exit(0);

const priorGreeted = loadFacts().filter(f => f.kind === "Greeted" && f.payload.author === trigger.payload.author);
const step = priorGreeted.length === 0 ? engine.on.steps[0] : engine.on.steps[1];

const inputs = { author: trigger.payload.author, pr_number: trigger.payload.pr_number };
if (step.skill === "welcome-back-contributor") inputs.prior_count = priorGreeted.length;

const agentFm = parseFrontmatter(readFileSync(join(AUTO, "agents", `${step.agent}.md`), "utf8"));
const agentOut = spawnSync("node", [join(ROOT, agentFm.entrypoint)], {
  input: JSON.stringify({ skill: step.skill, inputs }),
  encoding: "utf8",
});
if (agentOut.status !== 0) {
  console.error("Agent failed:", agentOut.stderr); process.exit(1);
}
const result = JSON.parse(agentOut.stdout);

const output = makeFact(step.agent, result.fact.kind, result.fact.payload, [trigger.id]);
appendFact(output);

execSync(`gh pr comment ${trigger.payload.pr_number} --body ${JSON.stringify(result.comment)}`, { stdio: "inherit" });

execSync(`git add .auto/facts/`, { cwd: ROOT });
execSync(`git -c user.name="auto-runner" -c user.email="auto@local" commit -m "facts: ${output.kind} (${output.payload.tier}) for #${trigger.payload.pr_number}" || true`, { cwd: ROOT, stdio: "inherit" });
execSync(`git push`, { cwd: ROOT, stdio: "inherit" });

function makeFact(by, kind, payload, prev = []) {
  const at = new Date().toISOString();
  const id = createHash("sha256").update(JSON.stringify({ by, kind, payload, prev, at })).digest("hex").slice(0, 12);
  return { id, at, by, kind, payload, prev };
}
function appendFact(f) {
  writeFileSync(join(FACTS, `${f.at.slice(0, 19).replace(/[:]/g, "-")}-${f.kind}-${f.id}.jsonl`), JSON.stringify(f) + "\n");
}
function loadFacts() {
  return readdirSync(FACTS).filter(n => n.endsWith(".jsonl"))
    .flatMap(n => readFileSync(join(FACTS, n), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l)));
}
function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? yaml.load(m[1]) : {};
}
