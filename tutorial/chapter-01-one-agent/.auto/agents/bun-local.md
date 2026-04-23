---
name: bun-local
kind: deterministic
capabilities: [skill-execution]
executes:
  - heartbeat
---

# Agent: bun-local

The deterministic agent for Chapter 1 of this example. The bun process that
runs `../../run.ts` IS this agent — reading `SKILL.md`, appending its Ran fact
to `log.jsonl`.

## Scope (explicit, no implicit functionality)

- Executes exactly one skill: `heartbeat`.
- No discovery, no dispatch, no routing. Extending to a second skill means
  writing another agent.

## How to invoke

Local-only (no git sync):
```
AGENT=bun-local bun run.ts
```

Git-native (pull → run → commit → push via the adapter):
```
AGENT=bun-local ./.auto/adapters/git-run bun examples/hello/run.ts
```
