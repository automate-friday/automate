---
pattern: chain-of-command
order:
  - alice
  - bob
  - carol
---

# Cooperation: chain of command

Strict precedence: agent B may act only after agent A has committed.
A DAG of dependencies expressed in the log.

## Protocol

1. Skill declares an ordered list of agents.
2. Agent `i` may append a Count only if agent `i-1` has already
   appended for the same turn.
3. Last agent in the chain closes the turn; next turn restarts at the
   head.

## Fact lifecycle

```
Turn(n=1)
Count(by=alice, n=1, phase=1)
→ Count(by=bob,   n=1, phase=2)   # bob may proceed; alice went
→ Count(by=carol, n=1, phase=3)   # carol closes turn

Turn(n=2)
Count(by=alice, n=2, phase=1)
Count(by=bob,   n=2, phase=2)
Count(by=carol, n=2, phase=3)
```

## When to use

- Sequential pipelines where each stage enriches the prior (ETL,
  validate → transform → publish).
- Audit requirements ("reviewer must sign before approver").
- You want deterministic ordering, not just eventual consistency.

Degenerate case `order: [alice, bob]` with turn=1 is the chapter-4
alternation pattern made explicit.
