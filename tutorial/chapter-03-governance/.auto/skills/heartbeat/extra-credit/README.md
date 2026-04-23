# Extra credit — governance beyond "human approves every run"

Chapter 3 introduces `automate/authority: human` and the PR-as-approval
adapter. That is **one** governance pattern among many. The fact log is
general enough to express every gating discipline in the distributed-systems
literature — M-of-N quorum, time-locks, multisig, graduated trust,
merge-queues, emergency overrides.

This folder catalogs those patterns. Each is a frontmatter fragment plus the
fact lifecycle it implies. The skill prose stays the same; only the
`automate/governance` block changes.

## The generic pattern

Every governance policy reduces to three questions:

1. **What counts as a valid proposal?** (who may propose, with what payload)
2. **What counts as sufficient approval?** (N signatures, a time delay,
   a confidence threshold, etc.)
3. **What happens on reject / withdraw / expiry?**

Chapter 3's canonical policy answers: (1) any agent, (2) one human signature,
(3) PR closed = proposal discarded.

## Catalog

| Pattern | Gate | Effort to make real |
|---|---|---|
| [quorum](./quorum.md) | K of N named approvers | moderate |
| [time-locked](./time-locked.md) | T minutes after proposal | trivial |
| [multisig](./multisig.md) | specific named parties all sign | moderate |
| [threshold-auto](./threshold-auto.md) | proposer confidence ≥ X auto-approves | trivial |
| [graduated-authority](./graduated-authority.md) | trust earned by run history | moderate |
| [withdraw-before-merge](./withdraw-before-merge.md) | proposer may rescind | trivial |
| [merge-queue](./merge-queue.md) | FIFO serial approval | moderate |
| [emergency-override](./emergency-override.md) | owner skips gate w/ audit | trivial |
| [spot-check](./spot-check.md) | every Nth run needs human | trivial |
| [dual-control](./dual-control.md) | proposer ≠ approver, two humans | trivial |

## The hard part is the fact vocabulary; everything else is ~10 lines

Every pattern adds 1–3 new fact kinds (`Approved`, `Vetoed`, `Withdrawn`,
`TimeLockElapsed`, etc.). The adapter reads the log, evaluates the policy,
and either merges the `Ran` fact or leaves the proposal open. The policy
evaluator is ~10 lines of pure function per pattern.

The skill body never changes. The log never changes format (still JSONL,
still `{id, at, by, kind, payload}`). Only the governance block and the
adapter's read-of-the-log logic move.

## How to activate a pattern

1. Copy the chosen pattern's `.md` up to the skill's `SKILL.md` frontmatter
   (merge the `metadata.automate/governance` block).
2. Update the adapter's approval evaluator to match the pattern's rules.
3. Register any new approver agents in `.auto/agents/`.

The log will start producing the new fact kinds immediately. Old facts
stay valid — governance policy change is a forward-only transition.
