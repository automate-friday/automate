---
name: telegram-bot
kind: bot
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: telegram-bot

Telegram bot command (e.g. `/heartbeat`) that posts a fact through the commit
bridge.

## Read → compose → publish

- **Read**: Bot fetches SKILL.md via GitHub API or has it cached.
- **Compose**: Command handler builds the fact.
- **Publish**: POST to shared commit bridge.

## Invocation

User messages `/heartbeat` to the bot:

```
→ Telegram Bot API delivers the message
→ Bot HTTP POST to https://<bridge>/append/heartbeat
  body: { "by": "telegram-bot", "payload": { "runner": "telegram-chat-12345" } }
→ Bridge commits + pushes
→ Bot replies via sendMessage
```

## Effort

Moderate. Same bridge. Telegram's Bot API is simple (long-polling or webhook).
