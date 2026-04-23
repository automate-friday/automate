---
name: codex-local
kind: llm
pattern: A
status: stub
executes:
  - heartbeat
---

# Agent: codex-local

The `codex` CLI, running on a developer laptop with git credentials, acting as
an LLM agent that reads `SKILL.md` and appends a fact.

## Read → compose → publish

- **Read**: SKILL.md piped as the system prompt.
- **Compose**: LLM produces a JSON object matching the skill's output shape.
- **Publish**: local git push via `git-run`.

## Invocation

```sh
AGENT=codex-local ./.auto/adapters/git-run sh -c '
  SKILL_BODY=$(cat .auto/skills/heartbeat/SKILL.md)
  codex -p "$SKILL_BODY

  Run this skill now. Write the Ran fact directly to
  .auto/skills/heartbeat/log.jsonl. Use by=codex-local."
'
```

## Effort

Trivial. Any LLM CLI with a `-p` headless mode substitutes cleanly.
