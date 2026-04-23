---
pattern: leader-election
epochMinutes: 5
---

# Cooperation: leader election via log

One agent is "leader" per epoch. The leader performs the count; others
watch. Leadership rotates on epoch boundaries or when the leader stops
heartbeating.

## Protocol

1. On epoch start, any agent may append `LeaderClaim{by, epoch}`.
2. Earliest `LeaderClaim` for an epoch wins (log order arbitrates).
3. Leader appends Counts during the epoch.
4. If the leader misses a heartbeat deadline, any agent may append
   `LeaderTimeout{epoch}` and claim the next epoch.

## Fact lifecycle

```
Epoch(n=7, startsAt=T0)

LeaderClaim(by=alice, epoch=7, at=T0+0.2s)   # wins
LeaderClaim(by=bob,   epoch=7, at=T0+0.8s)   # ignored

Count(by=alice, n=1, epoch=7)
Count(by=alice, n=2, epoch=7)
Heartbeat(by=alice, epoch=7)
Count(by=alice, n=3, epoch=7)

Epoch(n=8, startsAt=T0+5m)
LeaderClaim(by=bob, epoch=8)
Count(by=bob, n=4, epoch=8)
```

## When to use

- Single-writer invariants; multiple agents shouldn't race.
- Leader is expensive to elect, cheap to run (stateful connection, etc.).
- Classic Raft / Paxos-style coordination where you don't want a full
  consensus library.

The "strict alternation" chapter-4 pattern is a 2-agent leader-election
with every turn its own epoch.
