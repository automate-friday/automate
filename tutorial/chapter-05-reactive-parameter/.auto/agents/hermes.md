---
name: hermes
kind: deterministic
capabilities: [skill-execution]
executes:
  - count-to-target
---

# Agent: hermes

A remote bun process running on the Hermes VPS (Hetzner leo-lab). Same
`counter.ts` as openclaw; different `AGENT` identity. Running on a different
host, with a different cron phase.

## Invoke (on the hermes host)

```
AGENT=hermes ./.auto/adapters/git-run bun tutorial/chapter-05-reactive-parameter/counter.ts
```

## Cron (offset from openclaw to reduce collisions)

```
1-59/2 * * * *  cd /repo && AGENT=hermes ./tutorial/chapter-05-reactive-parameter/.auto/adapters/git-run bun tutorial/chapter-05-reactive-parameter/counter.ts
```

When `TargetChanged` facts arrive, hermes picks them up on its next tick —
no re-deploy, no restart. That's the point of the chapter: reactivity lives
in the log, not in the agent.
