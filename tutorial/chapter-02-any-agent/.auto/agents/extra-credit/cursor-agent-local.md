---
name: cursor-agent-local
kind: llm
pattern: A
status: stub
executes:
  - heartbeat
---

# Agent: cursor-agent-local

The `cursor-agent` CLI (composer-2-fast for headless cost-efficiency),
running on a developer laptop with git credentials, as an LLM agent.

## Read → compose → publish

- **Read**: SKILL.md piped as the prompt.
- **Compose**: cursor-agent produces JSON matching the output shape.
- **Publish**: local git push via `git-run`.

## Invocation

```sh
AGENT=cursor-agent-local ./.auto/adapters/git-run sh -c '
  SKILL_BODY=$(cat .auto/skills/heartbeat/SKILL.md)
  cursor-agent -p "$SKILL_BODY

  Run this skill now. Write the Ran fact directly to
  .auto/skills/heartbeat/log.jsonl. Use by=cursor-agent-local."
'
```

## Effort

Trivial. Identical shape to codex-local; only the CLI binary differs.
