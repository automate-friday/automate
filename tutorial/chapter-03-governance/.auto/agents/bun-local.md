---
name: bun-local
kind: deterministic
authority: default
capabilities: [skill-execution]
executes:
  - heartbeat
---

# Agent: bun-local

Deterministic. Authority: `default` — it can **propose** Ran facts but cannot
confirm them on its own. To fulfil a governed skill, it opens a PR and waits
for a `human`-authority agent to approve.
