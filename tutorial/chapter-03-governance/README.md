# Chapter 3 — governance via the fact log

**Same skill, higher authority. Proposals need approval to merge.**

## Picking up from Chapter 2

At the end of Chapter 2 you ran the skill with your own agent and saw a new
Ran fact appear in your local copy of `log.jsonl`. Good. That append is
*local* — no one else has seen it yet. To share it with other agents, someone
needs to commit and push it to the shared remote.

For a low-stakes skill like `heartbeat`, your agent can just do it: pull →
append → commit → push, straight to main. That's what `.auto/adapters/git-run`
does in chapters 1, 2, 4, and 5. No gate, no review. If your write credentials
say "default authority," the shared log accepts your append immediately.

But **not every skill should work that way.** Imagine the skill was
`send-customer-refund` or `rotate-production-secret`. You don't want an LLM
agent that read a README to unilaterally push a commit into main. You want a
gate: your agent *proposes*, a human (or a trusted peer) *approves*, and the
log records the full review trail.

Chapter 3 adds that gate as a property of the skill itself — right there in
the frontmatter.

## The delta from Chapter 2

Two things change:

1. **The skill declares an authority.** The frontmatter gains
   `automate/authority: human`. Any agent at lower authority can only
   **propose** Ran facts; a human-authority agent must approve.

2. **Agents declare their authority.** Every agent registration names its
   level (`default`, `human`, etc.). The log checks the author's level before
   accepting a fact.

## Read the log

```
{ Genesis                  by: jacob                                }
{ RanProposed p-…-001      by: bun-local         }  ← bun proposes
{ RanApproved p-…-001      by: jacob             }  ← human approves
{ Ran         p-…-001      by: bun-local         }  ← merged, confirmed
{ RanProposed p-…-002      by: claude-code-local }  ← proposed, waiting
(no RanApproved for p-…-002 yet — this is the review queue)
```

An outside observer can answer "what's pending?" by scanning for
`RanProposed` facts with no matching `RanApproved`.

## How the git adapter changes

Chapter 1-2 adapter: `git pull → append → commit → push`.

Chapter 3 adapter: `git pull → append RanProposed → branch → commit → push → gh pr create`.
Human reviews the PR. The **merge commit** is the `RanApproved` signal. A
downstream follow-up job appends the confirmed `Ran` fact. Not exercised end-to-end
in this toy — the point is that the declarative `automate/authority` field in
the skill's frontmatter is where governance starts; everything else is adapter
wiring and existing GitHub review UI.

## What this validates

- Governance is a property of the **skill**, not of the framework. A skill
  that declares `automate/authority: human` is asking for human approval.
- The log records the review cycle (proposed → approved → merged) as
  first-class facts, so audit history is just reading the log.
- No new primitives. Same `{id, at, by, kind, payload}` shape. Different
  `kind` values describe the lifecycle.

## What's next

- **Chapter 4** — two agents cooperate to count from 1 to 10 without talking
  to each other, coordinating purely through git + the fact log.
