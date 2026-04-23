#!/usr/bin/env bun
// run.ts — the agent. Reads the skill, does what it says, appends a fact.
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FACTS = join(HERE, ".auto", "facts");
mkdirSync(FACTS, { recursive: true });

const at = new Date().toISOString();
const fact = {
  id: createHash("sha256").update(at + hostname()).digest("hex").slice(0, 12),
  at,
  by: "heartbeat",
  kind: "Ran",
  payload: { runner: hostname(), at_iso: at },
};

const file = join(FACTS, `${at.replace(/[:.]/g, "-")}-${fact.id}.jsonl`);
writeFileSync(file, JSON.stringify(fact) + "\n");
console.log(`appended ${fact.kind} fact ${fact.id} -> ${file}`);
