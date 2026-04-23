---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
---

# Heartbeat (vanilla flavor)

Pure Anthropic Skill shape. Frontmatter has only `name` + `description`; the
body is natural language. No machine-checkable contracts.

## What to do

Append one new line to `log.jsonl` in the same folder as this flavor's parent
skill (`.auto/skills/heartbeat/log.jsonl`) with a single fact of this shape:

```json
{
  "id": "<12 hex chars, sha256(at + runner + by) truncated>",
  "at": "<ISO 8601 timestamp>",
  "by": "<agent id, e.g. bun-local>",
  "kind": "Ran",
  "payload": { "runner": "<hostname or environment tag>" }
}
```

## When to use this flavor

- You're just starting — the skill's contract hasn't settled yet.
- Agents executing this skill are LLMs or humans who will read prose anyway.
- You want zero framework dependency beyond "read markdown, append JSONL."

Anthropic-compatible tools will happily load this file; they only look at
`name` + `description`.
