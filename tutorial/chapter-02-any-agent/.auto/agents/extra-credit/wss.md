---
name: wss
kind: protocol
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: wss

Same as `websocket` but over `wss://` (TLS). The only real change is the
scheme; the bridge endpoint needs a valid TLS certificate (Cloudflare, Let's
Encrypt, etc.).

## Read → compose → publish

Identical to `websocket`. All traffic is encrypted in transit.

## Invocation

```js
const ws = new WebSocket("wss://<bridge>/append/heartbeat");
ws.send(JSON.stringify({ by: "wss-browser", payload: { runner: window.location.host } }));
```

## Effort

Moderate. If the bridge is already fronted by TLS (which it normally would
be), `wss` is free. Listed separately because "secure by default" is worth
calling out as a first-class option.
