---
pattern: work-stealing
---

# Cooperation: work stealing

Idle agents scan the log for pending work posted by other agents and
claim it. Whoever claims first does the work; the log arbitrates.

## Protocol

1. An agent (producer or a scheduler) appends `CountPending{n}` for each
   integer 1..10.
2. Any idle agent reads `CountPending` facts with no matching
   `CountClaimed`.
3. Idle agent appends `CountClaimed{n, by}`; if two agents claim the
   same `n` concurrently, git pull + re-read makes the loser pick
   another.
4. Claimant appends `Count{n, by}` when done.

## Fact lifecycle

```
CountPending(n=1)
CountPending(n=2)
CountPending(n=3)

CountClaimed(by=alice, n=1)    # alice grabs 1
CountClaimed(by=bob,   n=2)    # bob grabs 2 in parallel
Count(by=alice, n=1)
Count(by=bob,   n=2)

CountClaimed(by=alice, n=3)
Count(by=alice, n=3)
```

## When to use

- Pool of homogeneous agents; whoever's free should act.
- Order doesn't matter (embarrassingly parallel work).
- Classic Cilk / fork-join parallelism, expressed declaratively.

Unlike chapter-4's strict alternation, order doesn't matter here —
only completion.
