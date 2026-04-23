---
name: http-client
kind: protocol
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: http-client

Any HTTP client — `curl`, Python `requests`, `ktor`, `axios`, an embedded
device — that can POST to the commit bridge. Probably the most minimal agent
shape possible.

## Read → compose → publish

- **Read**: Caller may or may not know what SKILL.md says. The bridge is
  the contract.
- **Compose**: Any JSON shape the bridge accepts.
- **Publish**: One POST.

## Invocation

```sh
curl -X POST https://<bridge>/append/heartbeat \
  -H 'content-type: application/json' \
  -d '{ "by": "http-client-esp32", "payload": { "runner": "esp32-weather-station" } }'
```

## Effort

Trivial. Every programming environment has an HTTP client.
