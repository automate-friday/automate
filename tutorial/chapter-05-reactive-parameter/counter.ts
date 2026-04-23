#!/usr/bin/env bun
// counter.ts — count-to-target agent.
// Reads the log, derives `target` from the latest TargetChanged (or Genesis),
// derives `current` from the latest Count, and appends one Count if it's our
// turn and we're below target. Same code on every participating agent;
// AGENT env var differentiates.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const agent = process.env.AGENT;
if (!agent) {
  console.error("AGENT env var is required (e.g. openclaw, hermes)");
  process.exit(2);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG = join(HERE, ".auto", "skills", "count-to-target", "log.jsonl");

const lines = existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean) : [];
const facts = lines.map((l) => JSON.parse(l));

const genesis = facts.find((f) => f.kind === "Genesis");
if (!genesis) {
  console.error(`[${agent}] no Genesis in log; cannot derive initial target`);
  process.exit(1);
}
const latestTargetChange = facts.filter((f) => f.kind === "TargetChanged").at(-1);
const target = latestTargetChange?.payload.target ?? genesis.payload.target;

const counts = facts.filter((f) => f.kind === "Count");
const last = counts.at(-1);
const current = last?.payload.n ?? 0;

if (current >= target) {
  console.log(`[${agent}] current=${current} >= target=${target}; passing`);
  process.exit(0);
}
if (last && last.by === agent) {
  console.log(`[${agent}] I was the last counter (n=${current}); waiting for another agent`);
  process.exit(0);
}

const n = current + 1;
const at = new Date().toISOString();
const fact = {
  id: createHash("sha256").update(at + agent + String(n)).digest("hex").slice(0, 12),
  at,
  by: agent,
  kind: "Count",
  payload: { n },
};
appendFileSync(LOG, JSON.stringify(fact) + "\n");
console.log(`[${agent}] counted ${n} (target=${target})${n === target ? " — TARGET REACHED" : ""}`);
