---
pattern: hot-potato
---

# Cooperation: hot-potato token

A token is explicitly passed from agent to agent. Whoever currently holds
the token is authorised to act; on completion, they pass it.

## Protocol

1. Genesis creates the token: `TokenHeld{by=alice}`.
2. The token holder acts (appends the domain fact, e.g. `Count`).
3. On finishing, holder appends `TokenPassed{from, to}` naming the next
   holder.
4. Any agent not named `to` is frozen until the token comes their way.

## Fact lifecycle

```
TokenHeld(by=alice)
Count(by=alice, n=1)
TokenPassed(from=alice, to=bob)

TokenHeld(by=bob)
Count(by=bob, n=2)
TokenPassed(from=bob, to=carol)

TokenHeld(by=carol)
Count(by=carol, n=3)
TokenPassed(from=carol, to=alice)   # round-robin
```

## When to use

- Explicit ordering required (pipeline stages, relay race).
- Next actor is a function of problem state (e.g. route to the agent
  that owns the data).
- You want fairness by design rather than by luck.

Dropped potato: a `TokenTimeout{by, at}` recovery fact lets the system
reclaim a stuck token. Pair with heartbeats.
