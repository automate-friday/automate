---
name: claude-p
kind: llm
capabilities: [skill-execution, reasoning]
runtime: shell
entrypoint: scripts/agents/claude-p.mjs
metadata:
  automate/promises:
    - "Given a SKILL.md and `with:` inputs, I will pipe the full skill body plus inputs to `claude -p` as a prompt, parse a JSON block from the response, and return it as the skill output."
    - "My output will validate against the skill's `automate/outputSchema`. If the LLM produces invalid JSON I will fail loudly so the adapter can retry or escalate."
    - "I may rewrite template text more naturally than deterministic-local. Same contract, richer behavior."
  automate/how-to-request:
    via: fact-log
    request-kind: WorkRequested
    request-payload:
      skill: <slug>
      inputs: <object matching skill automate/inputSchema>
      agent: claude-p
    response-kind: WorkDone
    response-payload: <object matching skill automate/outputSchema>
---

# Agent: claude-p (LLM)

Executes any skill by piping `SKILL.md + inputs` into `claude -p` and parsing a
JSON block out of the response. Same capability (`skill-execution`) as
`deterministic-local`, same contract — different implementation.

## The swap

This is the PyTorch moment. In PyTorch, `model(x)` is the same call whether the
backend is eager Python or a compiled CUDA kernel. Here:

```yaml
# before:
agent: deterministic-local

# after:
agent: claude-p
```

That's the whole diff. Skill files don't change. Engine lifecycle doesn't change.
Fact log doesn't change. The adapter looks up the agent by name and hands off.

## Not wired in the demo

This file is present as a reference declaration. The demo runs
`deterministic-local`. To try `claude -p`, change the `agent:` line in
`.auto/engines/pr-greeter/lifecycle.yaml` and ensure `claude` is on PATH.
