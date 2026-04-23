// scenarios/count-to-ten.ts — drive chapter 4's counter to 10 via strict
// alternation. Two agents, ten turns, assert terminal state.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CH6 = resolve(HERE, "..");
const CH4 = resolve(CH6, "..", "chapter-04-count-to-ten");

export default {
  name: "count-to-ten (strict alternation, openclaw first)",
  skillLog: join(CH4, ".auto", "skills", "count-to-ten", "log.jsonl"),
  resetScript: join(CH6, "reset.sh"),
  steps: [
    { kind: "run", agent: "openclaw", script: join(CH4, "counter.ts") },
    { kind: "run", agent: "hermes",   script: join(CH4, "counter.ts") },
    { kind: "run", agent: "openclaw", script: join(CH4, "counter.ts") },
    { kind: "run", agent: "hermes",   script: join(CH4, "counter.ts") },
    { kind: "run", agent: "openclaw", script: join(CH4, "counter.ts") },
    { kind: "run", agent: "hermes",   script: join(CH4, "counter.ts") },
    { kind: "run", agent: "openclaw", script: join(CH4, "counter.ts") },
    { kind: "run", agent: "hermes",   script: join(CH4, "counter.ts") },
    { kind: "run", agent: "openclaw", script: join(CH4, "counter.ts") },
    { kind: "run", agent: "hermes",   script: join(CH4, "counter.ts") },
  ],
  expect: {
    // Genesis + 10 Counts
    kinds: ["Genesis", "Count", "Count", "Count", "Count", "Count", "Count", "Count", "Count", "Count", "Count"],
    lastPayload: { n: 10 },
  },
};
