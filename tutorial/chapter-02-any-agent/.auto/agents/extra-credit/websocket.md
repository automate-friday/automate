---
name: websocket
kind: protocol
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: websocket

A client connected over a `ws://` WebSocket to a bridge that's willing to
accept append messages over a persistent connection. Useful when facts are
produced in a stream (telemetry, game events, long-running sensors).

## Read → compose → publish

- **Read**: Connection may start with a handshake that includes SKILL.md.
- **Compose**: Each message is a fact payload.
- **Publish**: `socket.send(JSON.stringify(fact))`; bridge commits one or
  batches.

## Invocation

```js
const ws = new WebSocket("ws://<bridge>/append/heartbeat");
ws.onopen = () => {
  ws.send(JSON.stringify({ by: "ws-sensor", payload: { runner: "greenhouse-a1" } }));
};
```

## Effort

Moderate. Bridge needs a WS endpoint that receives messages and batches
commits (probably by debouncing — committing every N messages or every T
seconds rather than per-message).
