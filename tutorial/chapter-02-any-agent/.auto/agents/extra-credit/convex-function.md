---
name: convex-function
kind: serverless
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: convex-function

A Convex HTTP action that fulfils the skill whenever it's invoked. Convex
can't `git push` directly, so it commits via the GitHub REST API.

## Read → compose → publish

- **Read**: Fetch SKILL.md via GitHub API (`GET /contents`).
- **Compose**: Build the fact inside the action handler.
- **Publish**: `PUT /contents/.auto/skills/heartbeat/log.jsonl` with the
  new file contents (appended line) — or via the commit-bridge proxy to
  avoid hitting the GitHub API directly from Convex.

## Invocation

```ts
// convex/heartbeat.ts
import { httpAction } from "./_generated/server";

export const run = httpAction(async (ctx, req) => {
  const fact = buildRanFact({ by: "convex-function", runner: "convex-prod" });
  await fetch("https://<bridge>/append/heartbeat", {
    method: "POST",
    body: JSON.stringify(fact),
  });
  return new Response("ok");
});
```

## Effort

Moderate. Convex deployment + route wiring. Bridge is shared.
