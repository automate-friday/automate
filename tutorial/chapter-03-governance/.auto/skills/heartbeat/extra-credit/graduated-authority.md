---
pattern: graduated-authority
authority: earned
tiers:
  - runs: 0
    requires: human
  - runs: 10
    requires: peer
  - runs: 100
    requires: none
---

# Governance: graduated authority

New agents start restricted; trust is **earned** by a history of approved
runs. The log itself is the record that unlocks escalating autonomy.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: graduated-authority
    tiers:
      - { runs: 0,   requires: human }
      - { runs: 10,  requires: peer  }
      - { runs: 100, requires: none  }
```

## Fact lifecycle

```
# Agent "new-bot" proposes run #1
RanProposed(by=new-bot, proposalId=P1)
→ [runs=0, tier=human]
→ RanApproved(by=alice) → Ran

# ... 10 successful Rans later, new-bot proposes run #11
RanProposed(by=new-bot, proposalId=P11)
→ [runs=10, tier=peer]
→ RanApproved(by=some-other-agent) → Ran

# ... run #101
RanProposed(by=new-bot, proposalId=P101)
→ [runs=100, tier=none]
→ Ran  # no approval needed
```

The adapter counts prior `Ran` facts `by=<agent>` to determine tier.

## When to use

- Onboarding new LLM agents; don't drown humans in approvals once an agent
  is known to be reliable.
- Marketplace of third-party agents with reputations that compound.
- Promise-theory alignment: trust is observed, not assigned.

Trust can also be *lost* — a `TrustRevoked` fact resets the counter.
