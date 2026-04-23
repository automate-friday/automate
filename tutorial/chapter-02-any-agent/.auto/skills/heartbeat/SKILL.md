---
name: heartbeat
description: Record that an agent ran you. The skill owns its log. Any agent may fulfil it.
---

# Heartbeat

The skill owns `log.jsonl` in this folder. To run the skill, append one new
line to `log.jsonl`.

## Log format

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

Position and predecessors are **derivable** by reading the log, not stored.

## Who may fulfil this skill

Anyone. The skill doesn't name an agent. Whoever shows up writes the fact;
the log records who. See `.auto/agents/` for the agents registered in this
chapter.
