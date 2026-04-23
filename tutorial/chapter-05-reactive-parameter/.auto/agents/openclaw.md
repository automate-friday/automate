---
name: openclaw
kind: deterministic
capabilities: [skill-execution]
executes:
  - count-to-target
---

# Agent: openclaw

A remote bun process running on an OpenClaw container. Runs `counter.ts` on a
short cron. Pulls latest, computes `target` and `current` from the log, and
appends a Count if it's its turn.

## Invoke (on the openclaw host)

```
AGENT=openclaw ./.auto/adapters/git-run bun tutorial/chapter-05-reactive-parameter/counter.ts
```

## Cron

```
*/2 * * * *  cd /repo && AGENT=openclaw ./tutorial/chapter-05-reactive-parameter/.auto/adapters/git-run bun tutorial/chapter-05-reactive-parameter/counter.ts
```

Most ticks either progress the count by one or are a no-op ("I was last" or
"target reached"). When a user appends a `TargetChanged` fact, openclaw sees
it on the next tick and adapts.
