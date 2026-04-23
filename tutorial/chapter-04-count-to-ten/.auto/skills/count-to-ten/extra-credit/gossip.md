---
pattern: gossip
fanout: 3
---

# Cooperation: gossip protocol

Each agent has its **own log** (own git repo). Agents periodically
exchange facts with peers, propagating state until the network
converges. No central log.

## Protocol

1. Each agent maintains `~/logs/<skill>.jsonl` locally.
2. On a tick, agent picks `fanout` random peers and exchanges missing
   facts (both pull each other's log).
3. Facts are merged by `id` — duplicates dropped, ordering preserved
   per-agent but not globally.
4. Eventual consistency: every fact reaches every agent in
   O(log N × fanout) rounds.

## Fact lifecycle

```
# alice's log
Count(by=alice, n=1)

# bob's log (initially)
Count(by=bob, n=0)

# alice gossips with bob
GossipExchange(from=alice, to=bob, at=T)
→ bob now has: Count(by=alice, n=1) + Count(by=bob, n=0)
→ alice now has: Count(by=alice, n=1) + Count(by=bob, n=0)

# carol joins the network
GossipExchange(from=bob, to=carol, at=T+1)
→ carol converges
```

## When to use

- Agents are geographically distributed; a single authoritative log is
  impractical.
- Network partitions are common (intermittent connectivity).
- You want eventual consistency, not strict ordering.

This is the CRDT / distributed-systems end of the spectrum. Trade
simplicity for resilience.
