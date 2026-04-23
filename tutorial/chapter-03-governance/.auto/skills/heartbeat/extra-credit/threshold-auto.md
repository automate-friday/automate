---
pattern: threshold-auto
authority: confidence
minConfidence: 0.9
fallback: human
---

# Governance: threshold auto-approval

Proposer declares a **confidence score** on each proposal. If ≥ threshold,
the proposal auto-merges. If below, it falls back to human approval
(chapter-3 canonical pattern).

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: threshold-auto
    minConfidence: 0.9
    fallback: human
```

## Fact lifecycle

```
-- High confidence path --
RanProposed(proposalId=P, payload.confidence=0.97)
→ [threshold met, no human step]
→ Ran(proposalId=P)

-- Low confidence path --
RanProposed(proposalId=P, payload.confidence=0.62)
→ [below threshold, escalate]
→ Escalated(proposalId=P, to=human)
→ RanApproved(by=alice, proposalId=P)
→ Ran(proposalId=P)
```

## When to use

- Self-reporting LLM agents that can reason about their own certainty.
- Skills where most runs are routine and a minority need review.
- You want graceful degradation rather than a hard gate.

Trust: the proposer's self-reported confidence must itself be auditable.
Combine with `spot-check` to randomly verify claimed confidences.
