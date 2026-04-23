---
name: slack-bot
kind: bot
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: slack-bot

A Slack slash command (e.g. `/heartbeat`) that posts a fact through the
commit bridge. Identical shape to discord-bot — different surface.

## Read → compose → publish

- **Read**: Bot has SKILL.md prefetched or reads it via GitHub API.
- **Compose**: Slack command handler constructs the fact.
- **Publish**: POST to shared commit bridge.

## Invocation

User types `/heartbeat` in Slack:

```
→ Slack Events API hits bot endpoint
→ Bot HTTP POST to https://<bridge>/append/heartbeat
  body: { "by": "slack-bot", "payload": { "runner": "slack-workspace-T00ABC" } }
→ Bridge commits + pushes
→ Bot replies inline in Slack
```

## Effort

Moderate. Same bridge as discord-bot — zero new infra cost. Just a Slack app
registration and command handler.
