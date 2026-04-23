---
name: hermes
kind: deterministic
capabilities: [skill-execution]
executes:
  - count-to-ten
---

# Agent: hermes

A remote bun process running on the Hermes VPS (Hetzner leo-lab). Same
`counter.ts` as openclaw; different `AGENT` identity. Running on a different
host, with a different cron phase.

## Invoke (on the hermes host)

```
AGENT=hermes ./.auto/adapters/git-run bun tutorial/chapter-04-count-to-ten/counter.ts
```

## Cron (offset from openclaw to reduce collisions)

```
1-59/2 * * * *  cd /repo && AGENT=hermes ./tutorial/chapter-04-count-to-ten/.auto/adapters/git-run bun tutorial/chapter-04-count-to-ten/counter.ts
```

The odd-minute offset means openclaw and hermes almost never tick at exactly
the same moment. When they do collide, the git-run adapter's rebase-retry
loop sorts it out: whoever's push lands first wins the turn; the other
rebases, re-reads, sees the new state, and passes (because the winner was
the "last counter").
