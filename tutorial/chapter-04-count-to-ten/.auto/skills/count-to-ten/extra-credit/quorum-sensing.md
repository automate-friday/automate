---
pattern: quorum-sensing
minPresent: 3
windowMinutes: 5
---

# Cooperation: quorum sensing

Agents only act when **enough peers** have checked in recently. Below
the threshold, the skill pauses — too few witnesses to proceed safely.

## Protocol

1. Every active agent periodically appends `Presence{by, at}`.
2. Before appending a `Count`, an agent reads recent `Presence` facts
   (within `windowMinutes`).
3. If distinct recent presences < `minPresent`, the agent stands down
   and tries again next tick.
4. When the threshold is met, normal count rules apply.

## Fact lifecycle

```
Presence(by=alice, at=T)
Presence(by=bob,   at=T+10s)
# only 2 present; count paused

Presence(by=carol, at=T+20s)
# 3 present — quorum reached

Count(by=alice, n=1)
Count(by=bob,   n=2)
Count(by=carol, n=3)

# alice goes offline; her Presence ages out of the window at T+5m
# now only 2 recent Presences — count pauses until a new agent joins
```

## When to use

- Skills that require witnesses (audit, compliance, cross-check).
- Biological / physical analogues (bacterial quorum sensing, swarm
  behaviour) where action below a threshold is wasteful.
- Safety-critical loops: don't act alone, ever.

Complementary to graduated-authority (chapter 3): presence is the
runtime signal; trust tiers are the static policy.
