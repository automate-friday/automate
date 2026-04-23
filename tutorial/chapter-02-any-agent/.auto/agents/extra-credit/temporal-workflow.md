---
name: temporal-workflow
kind: durable-workflow
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: temporal-workflow

A Temporal workflow whose activity is "append a fact via the commit bridge."
Handles retries, durability, and scheduling as a native Temporal concern.

## Read → compose → publish

- **Read**: Activity reads SKILL.md once (cached) via GitHub API.
- **Compose**: Activity builds the fact.
- **Publish**: Activity HTTP POST to the commit bridge. Temporal retries on
  failure automatically.

## Invocation

```ts
// heartbeatWorkflow.ts
import { proxyActivities } from "@temporalio/workflow";
const { appendHeartbeatFact } = proxyActivities({ startToCloseTimeout: "30s" });

export async function heartbeatWorkflow() {
  await appendHeartbeatFact({ by: "temporal-workflow", runner: "temporal-prod" });
}
```

## Effort

Moderate. Temporal cluster or Temporal Cloud required. Bridge is shared.
