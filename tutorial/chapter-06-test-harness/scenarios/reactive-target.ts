// scenarios/reactive-target.ts — exercise chapter 5's reactivity.
// Count up, change the target, count further, shrink the target (pass),
// grow the target, finish.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CH6 = resolve(HERE, "..");
const CH5 = resolve(CH6, "..", "chapter-05-reactive-parameter");

const run = (agent: string) => ({ kind: "run" as const, agent, script: join(CH5, "counter.ts") });
const target = (n: number, id: string) => ({
  kind: "append" as const,
  fact: {
    id, at: "2026-04-23T00:00:00.000Z", by: "scenario",
    kind: "TargetChanged", payload: { target: n },
  },
});

export default {
  name: "count-to-target (reactive: 10 → overshoot 3 → resume at 7)",
  skillLog: join(CH5, ".auto", "skills", "count-to-target", "log.jsonl"),
  resetScript: join(CH6, "reset.sh"),
  steps: [
    // Genesis target=10. Count 1..5.
    run("openclaw"), run("hermes"),
    run("openclaw"), run("hermes"),
    run("openclaw"),
    // Shrink to 3 — current=5 so agents pass.
    target(3, "tgt-shrink-01"),
    run("hermes"), run("openclaw"),
    // Grow to 7 — agents resume from 6.
    target(7, "tgt-grow-02"),
    run("hermes"),    // n=6
    run("openclaw"),  // n=7 (target reached)
    run("hermes"),    // pass
  ],
  expect: {
    kinds: [
      "Genesis",
      "Count", "Count", "Count", "Count", "Count", // 1..5
      "TargetChanged",                              // shrink to 3
      "TargetChanged",                              // grow to 7
      "Count", "Count",                             // 6, 7
    ],
    lastPayload: { n: 7 },
  },
};
