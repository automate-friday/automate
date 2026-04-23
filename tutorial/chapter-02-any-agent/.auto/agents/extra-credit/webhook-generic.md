---
name: webhook-generic
kind: webhook
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: webhook-generic

Any system that can POST JSON. Send a payload to the commit bridge, the
bridge turns it into a Ran fact.

## Read → compose → publish

- **Read**: The caller may have SKILL.md cached locally, or just knows the
  POST shape.
- **Compose**: Whatever built the webhook payload.
- **Publish**: One HTTP POST.

## Invocation

```sh
curl -X POST https://<bridge>/append/heartbeat \
  -H 'content-type: application/json' \
  -d '{ "by": "my-system", "payload": { "runner": "prod-us-east-1" } }'
```

## Effort

Trivial. This IS the bridge's raw interface — every other Pattern B entry
in this folder ultimately uses this shape.
