#!/usr/bin/env bun
// run.ts — the bun-local agent. Appends one minimum-default Ran fact to the
// skill's log. Reads the log first only so agents that *want* to inspect
// prior state have a template for doing so.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const agent = process.env.AGENT ?? "bun-local";
const HERE = dirname(fileURLToPath(import.meta.url));
const LOG = join(HERE, ".auto", "skills", "heartbeat", "log.jsonl");

// Read the log (not persisted into the fact — just available if the agent needs it).
const priorRans = existsSync(LOG)
  ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((f) => f.kind === "Ran")
  : [];

const at = new Date().toISOString();
const runner = hostname();
const fact = {
  id: createHash("sha256").update(at + runner + agent).digest("hex").slice(0, 12),
  at,
  by: agent,
  kind: "Ran",
  payload: { runner },
};
appendFileSync(LOG, JSON.stringify(fact) + "\n");
console.log(`[${agent}] appended Ran ${fact.id} (log now has ${priorRans.length + 1} Ran facts)`);
