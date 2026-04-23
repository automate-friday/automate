---
name: discord-bot
kind: bot
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: discord-bot

A Discord slash command (e.g. `/heartbeat`) that posts a fact through the
commit bridge. No local git in the Discord runtime — the bridge commits on
the bot's behalf.

## Read → compose → publish

- **Read**: Bot has SKILL.md prefetched (periodic git pull) or lazily reads
  the raw file over the GitHub API.
- **Compose**: Bot constructs the JSON server-side when the slash command
  fires.
- **Publish**: Bot POSTs to the commit bridge with the fact payload.

## Invocation

User types `/heartbeat` in Discord:

```
→ Discord sends interaction to bot webhook
→ Bot HTTP POST to https://<bridge>/append/heartbeat
  body: { "by": "discord-bot", "payload": { "runner": "discord-guild-123" } }
→ Bridge commits + pushes
→ Bot replies with the fact id in Discord
```

## Effort

Moderate. Bot + slash-command registration is standard Discord work; the
bridge is shared with every other Pattern B runtime.
