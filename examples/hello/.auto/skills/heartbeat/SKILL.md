---
name: heartbeat
description: Record that an agent ran you. The skill owns its log.
---

# Heartbeat

The skill owns `log.jsonl` in this folder. To run the skill, append one new
line to `log.jsonl`.

## Log format (declared here; this is the contract)

**Genesis** — always the first line, written once when the skill is created:

```json
{ "id": "<12 hex>", "at": "<ISO 8601>", "by": "<creator>", "kind": "Genesis",
  "payload": { "skill": "heartbeat", "description": "…" } }
```

**Ran** — appended by any agent that runs the skill:

```json
{ "id": "<12 hex, sha256(at + runner + by) truncated>",
  "at": "<ISO 8601>",
  "by": "<agent id — e.g. bun-local, claude-code-local, human-terminal>",
  "kind": "Ran",
  "payload": { "runner": "<hostname or environment tag>" } }
```

Nothing else is stored. Position in the log ("I ran second") and the set of
prior runners are **derivable** by reading the log — they are not fields on
the fact. Agents that want to know where they stand read the log first.

That's the whole skill. Any agent — human, LLM, or deterministic script —
may fulfil it.
