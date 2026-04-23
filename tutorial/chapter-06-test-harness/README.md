# Chapter 6 — a test harness for skills

**You can fork a skill's log, run a scenario against it, and assert the
terminal state.**

Chapters 1-5 were about what agents *do*. This chapter is about how you
*test* what they do. There is no new primitive here — the harness is
itself just a script that resets a log and drives agents. But it makes
skills regression-testable, and that's the difference between a demo and
something you could ship.

## The pattern

A test is three things:

1. **A fork point.** `reset.sh` truncates a skill's log back to Genesis.
   Because Genesis is always the first line, the reset is trivial: keep
   line 1, drop the rest.
2. **A scenario.** An ordered list of steps: "run this agent", "append
   this fact". Scenarios are TS files — an `import` away from the
   counter scripts they drive.
3. **An assertion.** The `expect` clause names the sequence of fact
   kinds the log should contain at the end, and optionally the last
   fact's payload fields.

Run `harness.ts <scenario>` and you get a deterministic pass/fail.

## Layout

```
tutorial/chapter-06-test-harness/
├── harness.ts                              ← loads a scenario, runs it, asserts
├── reset.sh                                ← truncate a log back to Genesis
├── scenarios/
│   ├── count-to-ten.ts                     ← chapter 4, 10 alternating runs
│   └── reactive-target.ts                  ← chapter 5, with target changes
└── .auto/
    ├── skills/run-scenario/SKILL.md        ← meta-skill (optional)
    └── adapters/git-run                    ← same adapter as chapters 1-5
```

## Running the harness

```
bun tutorial/chapter-06-test-harness/harness.ts \
  tutorial/chapter-06-test-harness/scenarios/count-to-ten.ts

# output: [harness] PASS — 11 facts, terminal state matches
```

```
bun tutorial/chapter-06-test-harness/harness.ts \
  tutorial/chapter-06-test-harness/scenarios/reactive-target.ts

# output: [harness] PASS — 10 facts, terminal state matches
```

## Scenario shape

A scenario is a default-exported object:

```ts
export default {
  name: "count-to-ten",
  skillLog: "/abs/path/to/log.jsonl",
  resetScript: "/abs/path/to/reset.sh",
  steps: [
    { kind: "run", agent: "openclaw", script: "/abs/path/to/counter.ts" },
    { kind: "append", fact: { id: "...", at: "...", by: "scenario", kind: "TargetChanged", payload: { target: 7 } } },
    { kind: "run", agent: "hermes",   script: "/abs/path/to/counter.ts" },
  ],
  expect: {
    kinds: ["Genesis", "Count", "TargetChanged", "Count"],
    lastPayload: { n: 1 },
  },
};
```

Two step kinds:
- `run` — spawn `bun <script>` with `AGENT=<agent>` in the env. The
  agent reads the log, decides, appends. This is exactly what the
  cron-driven production agent does, minus the git wrap.
- `append` — directly append a fact to the log. Useful for simulating a
  human appending a governance fact (chapter 3) or a parameter change
  (chapter 5).

## Why this matters

- **CI:** these scenarios are fast (< 2s each) and deterministic. Every
  PR that touches a counter can run them.
- **Regression proof:** when you change a skill's protocol, the scenario
  either still passes (your change is compatible) or fails in a specific
  step (and tells you where to update the contract).
- **Documentation:** reading a scenario is reading an executable example
  of the skill's protocol. It's more precise than a README because it
  runs.

## What the harness does NOT do

- No parallelism. Steps run sequentially. Concurrency is tested at the
  `git-run` layer, not here.
- No time travel. The harness can't rewind mid-scenario; if you want to
  test a "what if" fork, write a second scenario from the same Genesis.
- No network. Scenarios are local file operations only. The git push/pull
  cycle is out of scope — that's what `.auto/adapters/git-run` is for in
  production.

## The delta from chapter 5

One new script (`harness.ts`), one new shell helper (`reset.sh`), and a
convention for scenario files. That's all. The framework primitives —
skill, agent, fact log — are unchanged. Testing is just "reset the log,
replay the history, compare."
