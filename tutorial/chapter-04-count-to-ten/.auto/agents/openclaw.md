---
name: openclaw
kind: deterministic
capabilities: [skill-execution]
executes:
  - count-to-ten
---

# Agent: openclaw

A remote bun process running on an OpenClaw container. Runs `counter.ts` on a
short cron (e.g. every 2 minutes). Pulls latest, checks if it's its turn,
appends a Count if so, commits, pushes.

## Invoke (on the openclaw host)

```
AGENT=openclaw ./.auto/adapters/git-run bun tutorial/chapter-04-count-to-ten/counter.ts
```

## Cron

```
*/2 * * * *  cd /repo && AGENT=openclaw ./tutorial/chapter-04-count-to-ten/.auto/adapters/git-run bun tutorial/chapter-04-count-to-ten/counter.ts
```

Most of the time the cron is a no-op ("I was the last counter; waiting").
When another agent has moved the counter forward, openclaw's next tick picks
up the turn and counts.
