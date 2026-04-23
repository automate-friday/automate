---
name: run-scenario
description: Run a deterministic test scenario against another skill's fact log. Reset the log, replay steps, assert the terminal state.
---

# Run Scenario

A meta-skill. Instead of producing business facts, it drives another skill
through a scripted sequence of agent runs and inline appends, then asserts
the terminal state of the target skill's log.

This is the testing/regression primitive for the framework. It has no log
of its own worth committing — the *artefact* of a run is the target
skill's log after reset, plus the harness's pass/fail exit code.

## How

1. A scenario is a TS module. It declares:
   - `skillLog` — absolute path to the target skill's `log.jsonl`.
   - `resetScript` — the `reset.sh` to truncate that log to Genesis.
   - `steps` — ordered list of either `{ kind: "run", agent, script }`
     or `{ kind: "append", fact }`.
   - `expect` — the kinds sequence (and optionally the last fact's
     payload fields) that the log should have at the end.
2. The harness resets the log, runs the steps, and compares.

## Why a skill, not just a script

Because in this framework, every unit of work is a skill. The harness
happens to be a meta-skill — it exists to validate other skills — but it
follows the same shape: natural-language declaration here, deterministic
executor in `harness.ts`. If later we want agents to *run scenarios on a
cron* (regression sweep), they register against this skill.

For now `harness.ts` is just invoked manually or from CI.
