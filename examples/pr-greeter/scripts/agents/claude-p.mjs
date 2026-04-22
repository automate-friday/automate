#!/usr/bin/env node
// claude-p.mjs — LLM-backed variant of the same "skill-execution" capability.
// Same stdin/stdout contract as deterministic-local.mjs; swap in lifecycle.yaml.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const req = JSON.parse(readFileSync(0, "utf8"));
const skillMd = readFileSync(join(ROOT, ".auto", "skills", req.skill, "SKILL.md"), "utf8");

const prompt = [
  skillMd,
  "",
  "## Inputs (JSON)",
  "",
  JSON.stringify(req.inputs, null, 2),
  "",
  "Respond with ONLY a single JSON object matching the skill's automate/outputSchema.",
  "No prose. No code fences. Just the JSON.",
].join("\n");

const out = execSync(`claude -p ${JSON.stringify(prompt)}`, { encoding: "utf8" });
const match = out.match(/\{[\s\S]*\}/);
if (!match) { console.error("claude-p: no JSON object in output"); process.exit(1); }
process.stdout.write(match[0]);
