---
name: llm-vps
kind: llm
pattern: A
status: concept
executes:
  - heartbeat
---

# Agent: llm-vps

Any LLM CLI (claude / codex / cursor-agent / gpt4all / ollama) running on a
VPS with the repo cloned and push credentials. Equivalent to `*-local` agents
except the process lives on a remote host.

## Read → compose → publish

- **Read**: SKILL.md on the VPS's local clone.
- **Compose**: LLM produces JSON matching the output shape.
- **Publish**: VPS-local git push via `git-run`.

## Invocation

```sh
# On the VPS, typically wired to cron:
cd /repo
AGENT=llm-vps-claude ./.auto/adapters/git-run sh -c '
  claude -p "$(cat .auto/skills/heartbeat/SKILL.md)

  Run this skill now. Write the Ran fact to .auto/skills/heartbeat/log.jsonl.
  Use by=llm-vps-claude."
'
```

## Effort

Trivial. VPS provisioning + cron setup is the only work.
