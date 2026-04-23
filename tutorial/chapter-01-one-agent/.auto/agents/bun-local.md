---
name: bun-local
kind: deterministic
capabilities: [skill-execution]
executes:
  - heartbeat
---

# Agent: bun-local

The deterministic agent for Chapter 1. The bun process that runs `run.ts`
IS this agent — it reads nothing (for this chapter, the fact shape is
hardcoded) and appends one Ran fact to `log.jsonl`.

The skill comes in three flavors under
`.auto/skills/heartbeat/flavors/` (vanilla / automate / automate+zod). The
vanilla flavor is chapter 1's canonical form; the bun-local agent does not
validate against any schema yet, so every flavor is equivalent from its
perspective.

## Scope (explicit, no implicit functionality)

- Executes exactly one skill: `heartbeat`.
- No discovery, no dispatch, no routing. Extending to a second skill means
  writing another agent.

## How to invoke

Local-only (no git sync):
```
cd tutorial/chapter-01-one-agent
AGENT=bun-local bun run.ts
```

Git-native (pull → run → commit → push via the adapter):
```
cd tutorial/chapter-01-one-agent
AGENT=bun-local ./.auto/adapters/git-run bun run.ts
```
