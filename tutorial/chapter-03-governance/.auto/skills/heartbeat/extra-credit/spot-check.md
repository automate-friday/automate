---
pattern: spot-check
authority: probabilistic
every: 10
---

# Governance: probabilistic spot check

Most runs auto-merge. Every Nth (or a random fraction) requires human
approval. Governance as sampling.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: spot-check
    every: 10      # every 10th proposal; or use `rate: 0.1`
---
```

## Fact lifecycle

```
-- Proposal #1..#9: auto --
RanProposed → Ran  (no approval step)

-- Proposal #10: sampled --
RanProposed(proposalId=P10)
→ SpotCheckRequired(proposalId=P10)
→ RanApproved(by=alice) → Ran

-- Proposal #11..#19: auto --
...

-- Proposal #20: sampled --
...
```

The adapter counts `Ran` facts and flags every 10th proposal for human
review. For `rate: 0.1`, flip a deterministic coin on `proposalId`.

## When to use

- High-volume skills where full approval would overwhelm reviewers.
- Compliance requires *some* oversight, not universal oversight.
- You want incentive compatibility: agents can't know which run gets
  sampled, so behaving well always is the dominant strategy.

Pair with `threshold-auto` — sample heavily on low-confidence runs,
lightly on high-confidence ones.
