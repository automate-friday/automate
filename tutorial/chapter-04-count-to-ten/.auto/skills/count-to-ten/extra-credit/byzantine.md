---
pattern: byzantine
tolerates: 1
requires: 4
---

# Cooperation: Byzantine agreement

Agents agree on the next count value **even if some agents lie or
produce inconsistent facts**. Requires N ≥ 3f + 1 for f Byzantine
faults.

## Protocol

For each turn, instead of appending a Count directly:

1. Each agent appends a `CountProposed{n, by, round}` fact.
2. Each agent reads all proposals for the current round.
3. Each agent appends a `CountVote{n, by, round}` for the majority value.
4. When ≥ `2f+1` matching `CountVote`s exist, the next `Count{n}` is
   committed and round advances.

## Fact lifecycle

```
CountProposed(by=a, n=4, round=3)
CountProposed(by=b, n=4, round=3)
CountProposed(by=c, n=4, round=3)
CountProposed(by=d, n=7, round=3)       # byzantine liar

CountVote(by=a, n=4, round=3)
CountVote(by=b, n=4, round=3)
CountVote(by=c, n=4, round=3)
→ [3 of 4 agree] → Count(n=4, round=3)
```

## When to use

- Multi-party protocols where agents may be malicious or compromised.
- Consortium settings with mutual distrust (supply-chain, cross-org).
- Foundational for blockchain-style log consensus.

Adapter complexity is real — this is the "hard" end of the catalog. Use
only when adversarial faults are in the threat model.
