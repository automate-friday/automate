---
pattern: dual-control
authority: human
requireDistinctProposerAndApprover: true
minApprovers: 2
---

# Governance: dual control (four-eyes)

At least two **distinct** human approvers, neither of whom is the
proposer. Standard four-eyes principle from financial and regulated
software.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: dual-control
    minApprovers: 2
    requireDistinctProposerAndApprover: true
```

## Fact lifecycle

```
RanProposed(by=alice, proposalId=P)
→ RanApproved(by=alice,   proposalId=P)   # REJECTED: proposer cannot approve
→ RanApproved(by=bob,     proposalId=P)   # 1/2
→ RanApproved(by=carol,   proposalId=P)   # 2/2
→ Ran(proposalId=P)
```

The adapter enforces two constraints: (1) `approver ≠ proposer`, and
(2) at least `minApprovers` distinct approvers. Self-approval or a
single approver is a protocol violation logged as `ApprovalRejected`.

## When to use

- Regulated deploys (SOX, PCI, HIPAA).
- Any skill touching money movement or customer PII.
- When you want to eliminate single-actor compromise paths entirely.

Differs from quorum: quorum allows the proposer to be one of the K
approvers; dual-control does not.
