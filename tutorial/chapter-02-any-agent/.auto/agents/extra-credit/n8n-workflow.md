---
name: n8n-workflow
kind: workflow-platform
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: n8n-workflow

An n8n workflow that includes an HTTP Request node pointed at the commit
bridge. Can be scheduled or triggered by any n8n event source.

## Read → compose → publish

- **Read**: Optional — the workflow can start from a fixed SKILL cache or
  fetch it via an n8n HTTP node.
- **Compose**: n8n's Function / Set nodes build the fact JSON.
- **Publish**: HTTP Request node POSTs to the commit bridge.

## Invocation

n8n workflow shape:

```
[Trigger: Cron 1h] → [Function: buildFact] → [HTTP Request: POST bridge/append/heartbeat]
```

The Function node returns `{ by: "n8n-workflow", payload: { runner: "n8n-cloud" } }`.

## Effort

Moderate. Any n8n user can clone a template workflow; the bridge is the
same shared one.
