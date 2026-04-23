---
pattern: quorum
authority: quorum
required: 2
of:
  - alice
  - bob
  - carol
  - dave
---

# Governance: quorum (K-of-N)

A proposal is merged once **K of N** registered approvers have signed. No
single approver is privileged; the set is named in frontmatter.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: quorum
    required: 2
    of: [alice, bob, carol, dave]
```

## Fact lifecycle

```
RanProposed(by=agent, proposalId=P)
→ RanApproved(by=alice, proposalId=P)         # 1/2, insufficient
→ RanApproved(by=carol, proposalId=P)         # 2/2, threshold met
→ Ran(by=agent, proposalId=P)                 # merged
```

The adapter counts `RanApproved` facts with matching `proposalId`. If count
≥ `required` **and** all approvers are members of `of`, the `Ran` fact is
emitted.

## When to use

- Multiple admins of equal authority; no single bus factor.
- Regulatory settings requiring segregation of duties.
- You want redundancy — any two of four can unblock work.

Degenerate case `required: 1, of: [alice]` is equivalent to the canonical
single-approver pattern.
