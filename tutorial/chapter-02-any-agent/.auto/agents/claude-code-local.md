---
name: claude-code-local
kind: llm
capabilities: [skill-execution]
executes:
  - heartbeat
---

# Agent: claude-code-local

An LLM executor. Reads `SKILL.md`, constructs the Ran fact itself, writes it
to `log.jsonl` using its own file-writing tool. No run.ts, no script — the
LLM IS the agent.

## Invoke

Hand the skill file to a headless Claude Code session and tell it to run:

```
claude -p "$(cat .auto/skills/heartbeat/SKILL.md)

Run this skill. Compute id = sha256(at + runner + by) truncated to 12 hex.
Use AGENT id 'claude-code-local'. Append the Ran fact to .auto/skills/heartbeat/log.jsonl."
```
