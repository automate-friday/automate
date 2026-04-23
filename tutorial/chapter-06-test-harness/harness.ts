#!/usr/bin/env bun
// harness.ts — run a deterministic scenario against a skill's log.
//
// A scenario is a TS module exporting:
//   - skillLog: absolute path to the skill's log.jsonl
//   - steps: array of { kind: "run", agent, script } | { kind: "append", fact }
//   - expect: { kinds: string[] } — sequence of fact kinds we expect at the end
//
// Usage: bun harness.ts <path/to/scenario.ts>
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const scenarioPath = process.argv[2];
if (!scenarioPath) {
  console.error("usage: bun harness.ts <scenario.ts>");
  process.exit(2);
}

type Step =
  | { kind: "run"; agent: string; script: string }
  | { kind: "append"; fact: Record<string, unknown> };

type Scenario = {
  name: string;
  skillLog: string;
  resetScript: string;
  steps: Step[];
  expect: { kinds: string[]; lastPayload?: Record<string, unknown> };
};

const mod = await import(pathToFileURL(resolve(scenarioPath)).href);
const scenario: Scenario = mod.default;

console.log(`[harness] running scenario: ${scenario.name}`);

// 1. Reset the log to Genesis.
const reset = spawnSync(scenario.resetScript, [scenario.skillLog], { stdio: "inherit" });
if (reset.status !== 0) {
  console.error("[harness] reset failed");
  process.exit(1);
}

// 2. Execute steps in order.
for (const [i, step] of scenario.steps.entries()) {
  if (step.kind === "run") {
    console.log(`[harness] step ${i}: run AGENT=${step.agent} ${step.script}`);
    const r = spawnSync("bun", [step.script], { env: { ...process.env, AGENT: step.agent }, stdio: "inherit" });
    if (r.status !== 0) { console.error("[harness] step failed"); process.exit(1); }
  } else {
    console.log(`[harness] step ${i}: append ${step.fact.kind}`);
    appendFileSync(scenario.skillLog, JSON.stringify(step.fact) + "\n");
  }
}

// 3. Read terminal log, compare.
const lines = existsSync(scenario.skillLog) ? readFileSync(scenario.skillLog, "utf8").trim().split("\n").filter(Boolean) : [];
const facts = lines.map((l) => JSON.parse(l));
const actualKinds = facts.map((f) => f.kind);

const ok = actualKinds.length === scenario.expect.kinds.length && actualKinds.every((k, i) => k === scenario.expect.kinds[i]);
if (!ok) {
  console.error(`[harness] FAIL — kinds mismatch`);
  console.error(`  expected: ${JSON.stringify(scenario.expect.kinds)}`);
  console.error(`  actual:   ${JSON.stringify(actualKinds)}`);
  process.exit(1);
}

if (scenario.expect.lastPayload) {
  const last = facts.at(-1);
  const expected = scenario.expect.lastPayload;
  const matches = Object.entries(expected).every(([k, v]) => JSON.stringify((last?.payload ?? {})[k]) === JSON.stringify(v));
  if (!matches) {
    console.error(`[harness] FAIL — last payload mismatch`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  actual:   ${JSON.stringify(last?.payload)}`);
    process.exit(1);
  }
}

console.log(`[harness] PASS — ${actualKinds.length} facts, terminal state matches`);
