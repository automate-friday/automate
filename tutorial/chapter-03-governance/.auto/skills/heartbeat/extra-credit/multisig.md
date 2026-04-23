---
pattern: multisig
authority: multisig
signers:
  - alice
  - bob
  - compliance-bot
---

# Governance: multisig

**All** named parties must sign before the proposal merges. Unlike quorum
(K-of-N), multisig is all-of-N — any missing signer blocks.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: multisig
    signers: [alice, bob, compliance-bot]
```

## Fact lifecycle

```
RanProposed(proposalId=P)
→ RanApproved(by=alice,          proposalId=P)   # 1/3
→ RanApproved(by=bob,            proposalId=P)   # 2/3
→ RanApproved(by=compliance-bot, proposalId=P)   # 3/3, complete
→ Ran(proposalId=P)
```

The adapter maintains a set of approvals per proposal. When the set equals
`signers` exactly, emit `Ran`.

## When to use

- High-stakes skills (deploy to prod, touch customer data, wire transfers).
- Regulatory regimes requiring engineering + legal + compliance sign-off.
- Non-human signers (a compliance bot that verifies policy before signing)
  sit alongside human ones — the adapter doesn't care.

`compliance-bot` is itself an agent; its approval is a normal
`RanApproved` fact. Governance and automation compose.
