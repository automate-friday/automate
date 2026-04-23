# Extra credit — cooperation beyond strict alternation

Chapter 4's canonical protocol is strict alternation: "if you were the last
to count, stand down; otherwise append +1". That's one coordination
discipline among many. The fact log is expressive enough for every
distributed-cooperation pattern in the textbooks — Byzantine agreement,
bidding, leader election, hot-potato tokens, work stealing, gossip,
tournaments, quorum sensing.

This folder catalogs those patterns, each as a brief protocol + fact
lifecycle. The skill's **core fact shape** stays the same
(`{id, at, by, kind, payload}`); only the set of fact kinds and the
read-before-write rule change.

## The generic pattern

Every cooperation protocol reduces to three questions:

1. **What do I read?** (what prior facts gate my action)
2. **What do I write?** (which fact kind advances the protocol)
3. **What about ties?** (when two agents race, who loses? — always
   arbitrated by git/log order, the losers re-read and reconsider)

Chapter 4 answers: (1) latest `Count`, (2) next `Count`, (3) second writer
pulls, sees the other's fact, passes.

## Catalog

| Pattern | Coordination primitive | Effort |
|---|---|---|
| [byzantine](./byzantine.md) | Agreement despite faulty agents | hard |
| [bidding](./bidding.md) | Auction for the next turn | moderate |
| [leader-election](./leader-election.md) | One agent coordinates per epoch | moderate |
| [hot-potato](./hot-potato.md) | Token passed explicitly | trivial |
| [work-stealing](./work-stealing.md) | Idle agents pull from a pending queue | moderate |
| [chain-of-command](./chain-of-command.md) | B runs only after A commits | trivial |
| [bounded-parallelism](./bounded-parallelism.md) | At most K simultaneous actors | moderate |
| [gossip](./gossip.md) | Facts propagate peer-to-peer across logs | hard |
| [tournament](./tournament.md) | Best-of-N decides the outcome | moderate |
| [quorum-sensing](./quorum-sensing.md) | Act only when K peers are present | moderate |

## The hard part is the read rule; everything else is ~10 lines

Every pattern is a **read-the-log-before-writing** policy plus a small
vocabulary of new fact kinds. The write itself is always the same
three-line "pull → append → push" loop from chapter 1. What varies is how
an agent decides whether it's its turn.

For each pattern: implement the read rule (~10 lines of log reduction) +
add the fact kinds. No locks, no message passing, no leader service. The
log is the coordination.

## How to activate a pattern

1. Adopt the chosen pattern's fact vocabulary in `SKILL.md`.
2. Implement the pattern's read-before-write rule in the agent's runtime.
3. Register 2+ agents in `.auto/agents/` (single-agent cooperation is
   degenerate).

Same git adapter, same JSONL format, same `.auto/` layout. Only the
protocol logic in the agent code changes.
