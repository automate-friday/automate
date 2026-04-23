---
name: bun-local
kind: deterministic
capabilities: [skill-execution]
executes:
  - heartbeat
---

# Agent: bun-local

A deterministic bun process. Runs `run.ts` (copied from Chapter 1 unchanged)
to append its Ran fact. Fast, reliable, no LLM in the loop.

## Invoke

```
AGENT=bun-local bun run.ts
```
