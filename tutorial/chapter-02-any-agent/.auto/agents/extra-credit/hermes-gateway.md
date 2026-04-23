---
name: hermes-gateway
kind: llm
pattern: A
status: runnable
executes:
  - heartbeat
---

# Agent: hermes-gateway

The existing Hermes Operating Agent on Hetzner leo-lab. Already runs a
15-minute cron loop against the `skill-library` repo. Adding heartbeat means
wiring one more invocation into its task loop.

## Read → compose → publish

- **Read**: Hermes pulls the repo every tick; SKILL.md is available locally.
- **Compose**: Hermes (Claude Code running on OpenClaw) reads SKILL.md and
  produces the fact.
- **Publish**: its existing `git commit && git push` step already writes to
  the same repo.

## Invocation

Add to Hermes' cron loop:

```sh
AGENT=hermes-gateway ./.auto/adapters/git-run bun tutorial/chapter-01-one-agent/run.ts
```

## Effort

Runnable — the infrastructure exists. Adding this skill is one cron entry.
