---
pattern: bounded-parallelism
maxConcurrent: 3
---

# Cooperation: bounded parallelism

At most **K** agents may be "in flight" at once. Agents announce entry
with a lease fact and exit with a release fact; the log shows current
occupancy.

## Protocol

1. Agent wanting to act reads the log for unreleased `LeaseAcquired`
   facts.
2. If count < `maxConcurrent`, append `LeaseAcquired{by, leaseId}`.
3. Do the work, append `Count{...}`.
4. Append `LeaseReleased{leaseId}`.
5. Races: if two agents acquire and total exceeds K, the highest-timestamp
   acquirers release and retry.

## Fact lifecycle

```
LeaseAcquired(by=alice, id=L1)     # in-flight: 1
LeaseAcquired(by=bob,   id=L2)     # in-flight: 2
LeaseAcquired(by=carol, id=L3)     # in-flight: 3 (at cap)

Count(by=alice, n=1)
LeaseReleased(id=L1)               # in-flight: 2

LeaseAcquired(by=dave, id=L4)      # admitted
Count(by=bob, n=2)
LeaseReleased(id=L2)
```

## When to use

- Rate-limited downstream (max N concurrent DB writes, API quota).
- Resource pools (connection cap, GPU slots).
- You want backpressure expressed in the protocol, not the runtime.

Semaphores, in fact-log form. K=1 reduces to strict serialization
(merge-queue from chapter-3).
