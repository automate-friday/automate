---
pattern: merge-queue
authority: human
serialize: true
---

# Governance: merge queue (FIFO serial approval)

Approvals happen one proposal at a time in submission order. Prevents
interleaved runs from racing or stepping on each other.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: human
    serialize: true
```

## Fact lifecycle

```
RanProposed(at=T1, proposalId=P1)  # head of queue
RanProposed(at=T2, proposalId=P2)  # blocked behind P1
RanProposed(at=T3, proposalId=P3)  # blocked behind P2

→ RanApproved(proposalId=P1) → Ran(P1)
   [queue advances]
→ RanApproved(proposalId=P2) → Ran(P2)
   [queue advances]
→ Vetoed(proposalId=P3)
   [P3 discarded; queue empty]
```

The adapter only considers the oldest open proposal for approval. Later
proposals cannot be approved until the head resolves (merged, withdrawn,
or vetoed).

## When to use

- Skills with ordering constraints (deploy #2 must follow deploy #1).
- Shared resource the skill mutates (database migration).
- You want human reviewers to handle one thing at a time.

GitHub-style merge queues (`gh pr merge --auto`) implement this in a
PR-based adapter for free.
