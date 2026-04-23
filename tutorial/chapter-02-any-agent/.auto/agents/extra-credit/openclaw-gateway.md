---
name: openclaw-gateway
kind: llm
pattern: A
status: stub
executes:
  - heartbeat
---

# Agent: openclaw-gateway

An OpenClaw container (isolated sandbox for running Claude Code sessions)
with the repo pre-cloned and push credentials. Same pattern as `llm-vps`,
but containerized so many instances can run in parallel without polluting
each other.

## Read → compose → publish

- **Read**: SKILL.md on the container's mounted volume.
- **Compose**: Claude Code session produces JSON (or runs a script).
- **Publish**: container-local git push via `git-run`.

## Invocation

```sh
openclaw run --image automate-friday:latest \
  --env AGENT=openclaw-gateway \
  --cmd "./.auto/adapters/git-run bun tutorial/chapter-01-one-agent/run.ts"
```

## Effort

Stub — needs an OpenClaw image with git + bun pre-installed and push keys
mounted at runtime.
