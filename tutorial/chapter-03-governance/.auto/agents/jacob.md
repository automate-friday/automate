---
name: jacob
kind: human
authority: human
capabilities: [skill-execution, skill-approval]
executes:
  - heartbeat
---

# Agent: jacob

The human. Authority: `human`. Can approve Ran proposals on any skill that
requires `automate/authority: human`. In practice this means: reviewing a PR
that contains a `RanProposed` fact, then merging it — the merge is what
produces the `RanApproved` fact on main.
