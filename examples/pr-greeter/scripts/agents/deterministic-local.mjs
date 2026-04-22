#!/usr/bin/env node
// deterministic-local.mjs — a zero-LLM agent. Reads SKILL.md, does {var}
// substitution against the `with:` inputs, emits output matching the skill's
// automate/outputSchema. Swap to claude-p.mjs for an LLM-backed variant.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const req = JSON.parse(readFileSync(0, "utf8"));

const skillMd = readFileSync(join(ROOT, ".auto", "skills", req.skill, "SKILL.md"), "utf8");
const commentMatch = skillMd.match(/## Comment template\s*\n\n([\s\S]*?)(?=\n##|\n?$)/);
const factMatch = skillMd.match(/## Fact to emit\s*\n\n```json\s*\n([\s\S]*?)\n```/);
if (!commentMatch || !factMatch) {
  console.error(`Skill ${req.skill} missing Comment template or Fact to emit section`);
  process.exit(1);
}

const vars = { ...req.inputs };
if (typeof vars.prior_count === "number") vars.prior_count_ordinal = ordinal(vars.prior_count + 1);

const comment = subst(commentMatch[1].trim(), vars);
const fact = JSON.parse(subst(factMatch[1].trim(), vars));
process.stdout.write(JSON.stringify({ comment, fact }));

function subst(s, v) { return s.replace(/\{(\w+)\}/g, (_, k) => k in v ? String(v[k]) : `{${k}}`); }
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], m = n % 100;
  return `${n}${s[(m - 20) % 10] || s[m] || s[0]}`;
}
