---
name: count-to-ten
description: Cooperatively count from 1 to 10 with other agents, coordinating only through this log.
---

# Count to Ten

Two or more agents are going to count from 1 to 10 together. No agent talks to
any other directly. The only shared state is this `log.jsonl`. Turn-taking is
enforced by reading the log before writing.

## Log format

**Genesis** — written once when the skill is created:

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<creator>", "kind": "Genesis",
  "payload": { "skill": "count-to-ten", "target": 10 } }
```

**Count** — appended by an agent taking its turn:

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<agent id>", "kind": "Count",
  "payload": { "n": <int> } }
```

## Protocol (what the skill says to do)

1. **Read** the log.
2. Find the latest `Count` fact (if any).
3. **If** its `payload.n >= 10`: the count is done. Do nothing.
4. **If** its `by` equals your agent id: you were the last to count. Do
   nothing — another agent must take the next turn.
5. **Otherwise** append a new Count fact with `n = (last.n or 0) + 1` and
   `by` set to your agent id.
6. Commit + push.

That's the whole protocol. Any agent following these rules will cooperate
correctly with any other agent following them. Strict alternation is
enforced by the "not me last" check — an agent cannot run the count up
alone.

## What makes this work without direct communication

- Every agent pulls the remote before reading → everyone sees the same log.
- The log is authoritative: whoever committed first wins this turn.
- The turn-taking rule means an agent can only append if the previous Count
  was by a *different* agent (or no Counts exist yet).
- If two agents try to append the same `n` concurrently, git's push-after-
  rebase loop will cause the second one to re-read, see the other's fact
  already landed, and pass.

No locks. No leader election. No message passing. Just "read, check, append"
— arbitrated by git.
