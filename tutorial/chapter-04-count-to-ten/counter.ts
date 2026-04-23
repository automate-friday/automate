#!/usr/bin/env bun
// counter.ts — the bun agent that implements the count-to-ten protocol.
// Same code runs on every participating agent; AGENT env var differentiates.
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
const LOG = join(HERE, ".auto", "skills", "count-to-ten", "log.jsonl");
const TARGET = 10;

const lines = existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean) : [];
const facts = lines.map((l) => JSON.parse(l));
const counts = facts.filter((f) => f.kind === "Count");
const last = counts.at(-1);

if (last && last.payload.n >= TARGET) {
  console.log(`[${agent}] target reached (n=${last.payload.n}); nothing to do`);
  process.exit(0);
}

if (last && last.by === agent) {
  console.log(`[${agent}] I was the last counter (n=${last.payload.n}); waiting for another agent`);
  process.exit(0);
}

const n = (last?.payload.n ?? 0) + 1;
const at = new Date().toISOString();
const fact = {
  id: createHash("sha256").update(at + agent + String(n)).digest("hex").slice(0, 12),
  at,
  by: agent,
  kind: "Count",
  payload: { n },
};
appendFileSync(LOG, JSON.stringify(fact) + "\n");
console.log(`[${agent}] counted ${n}${n === TARGET ? " — DONE" : ""}`);
