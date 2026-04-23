---
pattern: emergency-override
authority: human
overrides:
  - owner
---

# Governance: emergency override

Designated owner-tier agents may skip the standard gate — but the
override itself is logged as an auditable fact. Governance bent, not
broken.

## Frontmatter fragment

```yaml
metadata:
  automate/governance:
    policy: human
    overrides: [owner]
```

## Fact lifecycle

```
-- Normal path --
RanProposed(proposalId=P) → RanApproved → Ran

-- Override path --
RanProposed(by=incident-commander, proposalId=P)
→ OverrideInvoked(
    by=jacob,                # must be in `overrides` list
    proposalId=P,
    reason="SEV1 — restart required",
    ref="incident-2026-04-22"
  )
→ Ran(proposalId=P)
```

The `OverrideInvoked` fact is the audit trail. Any later review can
query `kind=OverrideInvoked` and see every exception with reason +
invoker + timestamp.

## When to use

- Incident response (prod is down, approval path is broken).
- Disaster recovery where a human must act faster than consensus allows.
- Break-glass procedures with retroactive justification requirements.

Pair with alerts: every `OverrideInvoked` fact pings the governance
channel. Overrides are rare; make them loud.
