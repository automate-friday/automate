---
name: heartbeat
description: Record that an agent ran you. Governed — appends require approval by an agent with higher authority.
metadata:
  automate/authority: human
---

# Heartbeat (governed)

Same skill as Chapter 2, with one addition: `automate/authority: human` in
the frontmatter. Any agent may **propose** a Ran, but the log only accepts it
once a human-authority agent has approved.

## Log format

**Genesis** — as before.

**RanProposed** — an agent says "I would like to run":

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<proposing agent>",
  "kind": "RanProposed",
  "payload": { "runner": "<hostname>", "proposalId": "<opaque id>" } }
```

**RanApproved** — a human-authority agent signs off:

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<approving agent>",
  "kind": "RanApproved",
  "payload": { "proposalId": "<same id>" } }
```

**Ran** — merged only after RanApproved exists:

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<proposing agent>",
  "kind": "Ran",
  "payload": { "runner": "<hostname>", "proposalId": "<same id>" } }
```

An agent looking at this log can filter: "proposals with no matching Approval
yet" = the review queue.

## How this actually happens in git

The adapter changes. Instead of `git push` to main, the proposing agent does:

```
git checkout -b proposal/<proposalId>
git add log.jsonl         # the agent added RanProposed
git commit + push branch
gh pr create              # opens a PR
```

A human-authority reviewer inspects the PR, optionally asks the agent to
re-run things, then **merges the PR**. The merge commit on main is the
`RanApproved` signal. The adapter on the agent side detects the merge and
appends the confirmed `Ran` fact.

The full flow is chapter 3.5 material (not implemented in this toy); the
point here is that the skill's *format declaration* is where governance
lives — everything else is adapter wiring.
