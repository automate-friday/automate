---
name: react-app
kind: browser
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: react-app

A React web app where a user clicks "run heartbeat" and the browser appends a
fact on their behalf. The browser can't commit to git directly, so it goes
through the commit bridge — authenticated as the user via a GitHub OAuth
token, or anonymously via a public bridge endpoint.

## Read → compose → publish

- **Read**: Component fetches SKILL.md via GitHub Raw to display it.
- **Compose**: Click handler assembles the fact client-side.
- **Publish**: `fetch(bridge, { method: 'POST', body })` from the browser.

## Invocation

```tsx
function HeartbeatButton() {
  return <button onClick={async () => {
    const fact = { by: "react-app", payload: { runner: `browser-${navigator.userAgent.slice(0,20)}` } };
    await fetch("https://<bridge>/append/heartbeat", {
      method: "POST",
      body: JSON.stringify(fact),
    });
  }}>Run heartbeat</button>;
}
```

## Effort

Moderate. Standard React + fetch call. Handling auth (user's GitHub token vs
public bridge) is the only real design decision.
