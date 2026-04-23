---
name: cloudflare-worker
kind: serverless
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: cloudflare-worker

A Cloudflare Worker that fulfils the skill — triggered by Cron Triggers, an
HTTP request, or a queue binding. Note: the commit bridge itself is a natural
Cloudflare Worker too.

## Read → compose → publish

- **Read**: Worker fetches SKILL.md via GitHub Raw on request.
- **Compose**: Build fact in `fetch` handler.
- **Publish**: Either POST to the shared bridge, or (if this worker IS the
  bridge) commit directly via the GitHub API.

## Invocation

```ts
// worker.ts
export default {
  async fetch(req: Request): Promise<Response> {
    const fact = { by: "cloudflare-worker", payload: { runner: "cf-colo-DFW" } };
    await fetch("https://<bridge>/append/heartbeat", {
      method: "POST",
      body: JSON.stringify(fact),
    });
    return new Response("ok");
  },
};
```

## Effort

Moderate. Wrangler + one worker. Shared bridge — or this worker can be the
bridge itself for self-hosted deployments.
