---
name: vercel-edge
kind: serverless
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: vercel-edge

A Vercel Edge Function that appends a fact on each invocation (HTTP trigger,
Vercel Cron, or on-demand).

## Read → compose → publish

- **Read**: Edge function fetches SKILL.md via GitHub Raw on cold start (or
  has it inlined at build time).
- **Compose**: Build the fact in the handler.
- **Publish**: `fetch(bridgeUrl, { method: 'POST', body })`.

## Invocation

```ts
// app/api/heartbeat/route.ts
export const runtime = "edge";
export async function POST() {
  await fetch("https://<bridge>/append/heartbeat", {
    method: "POST",
    body: JSON.stringify({ by: "vercel-edge", payload: { runner: "vercel-us-east" } }),
  });
  return new Response("ok");
}
```

## Effort

Moderate. Vercel deployment + one route. Bridge shared.
