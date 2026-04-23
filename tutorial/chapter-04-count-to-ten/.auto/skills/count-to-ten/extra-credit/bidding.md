---
pattern: bidding
window: 30s
---

# Cooperation: bidding for the turn

Agents who want the next turn post a **bid** (priority, capacity,
staleness). After a short window, highest bid wins.

## Protocol

1. After each Count commit, a bidding window opens (e.g. 30 seconds).
2. Any interested agent appends `Bid{amount, by, turn}`.
3. When the window closes, the agent with the highest `amount` appends
   the next `Count{n, by, turn}`.
4. Ties broken by fact `id` (lexicographic).

## Fact lifecycle

```
Count(n=3, by=alice, turn=3)
BidWindow(opened, turn=4, closesAt=T+30s)

Bid(by=alice, turn=4, amount=2)
Bid(by=bob,   turn=4, amount=7)   # wins
Bid(by=carol, turn=4, amount=5)

BidWindow(closed, turn=4, winner=bob)
Count(by=bob, n=4, turn=4)
```

## When to use

- Agents with varying capacity / cost; cheapest should win.
- Task allocation where "who should act" is a resource-optimisation
  question, not round-robin.
- Auction-based scheduling (spot-market style).

The adapter needs a clock to close the window — cron or workflow timer
appends the `BidWindow(closed)` fact.
