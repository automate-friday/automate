---
pattern: time-locked
authority: time
delayMinutes: 15
---

# Governance: time-locked

A proposal becomes auto-merged after **T minutes** unless vetoed during the
window. The delay is the governance — no human signature required, just a
chance for one to object.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: time-locked
    delayMinutes: 15
```

## Fact lifecycle

```
RanProposed(at=T0, proposalId=P)
[15-minute window open]
→ (no Vetoed facts for P)
→ TimeLockElapsed(at=T0+15m, proposalId=P)   # emitted by adapter cron
→ Ran(proposalId=P)                           # merged

-- OR, if a veto arrives --

RanProposed(at=T0, proposalId=P)
→ Vetoed(at=T0+3m, by=alice, proposalId=P, reason=...)
→ [proposal discarded; no TimeLockElapsed, no Ran]
```

## When to use

- Low-risk skills where humans should watch but usually don't need to act.
- Overnight batch windows where explicit approval is impractical.
- You want a "pull emergency brake" UX rather than "press go".

Adapter needs a scheduled check (cron, workflow timer) to emit the
`TimeLockElapsed` fact when the window closes.
