---
pattern: withdraw-before-merge
authority: human
allowWithdraw: true
---

# Governance: withdraw before merge

The proposer may **rescind** their own proposal before it merges. Useful
when the agent realises mid-flight that conditions changed.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: human
    allowWithdraw: true
```

## Fact lifecycle

```
RanProposed(by=bun-local, proposalId=P)
→ [proposer realises it already ran elsewhere]
→ Withdrawn(by=bun-local, proposalId=P, reason="duplicate")
→ [proposal closed; no Ran, no RanApproved needed]
```

An adapter seeing `Withdrawn` for an open proposal treats it as closed.
If a race happens (approval lands before withdraw is observed), the
`Ran` fact wins — log order arbitrates.

## When to use

- Long-lived proposals (days-long PR review) where state may drift.
- Agents capable of observing their own preconditions changing.
- Cooperative environments where "never mind" is common.

Only the original proposer may withdraw; the adapter rejects
`Withdrawn` facts with a mismatched `by`.
