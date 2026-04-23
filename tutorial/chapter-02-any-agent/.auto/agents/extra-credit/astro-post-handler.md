---
name: astro-post-handler
kind: server-endpoint
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: astro-post-handler

An Astro server endpoint (`.astro` or `.ts` route) that fulfils the skill on
POST. Can run on any Astro-supporting host (Netlify, Vercel, self-hosted).

## Read → compose → publish

- **Read**: Endpoint has SKILL.md bundled at build time or fetches at runtime.
- **Compose**: Endpoint builds fact server-side from request data + env.
- **Publish**: `fetch(bridgeUrl, ...)` server-side.

## Invocation

```ts
// src/pages/api/heartbeat.ts
import type { APIRoute } from "astro";
export const POST: APIRoute = async ({ request }) => {
  const fact = { by: "astro-post-handler", payload: { runner: new URL(request.url).host } };
  await fetch("https://<bridge>/append/heartbeat", {
    method: "POST",
    body: JSON.stringify(fact),
  });
  return new Response("ok");
};
```

## Effort

Moderate. Standard Astro + fetch. Bridge is shared.
