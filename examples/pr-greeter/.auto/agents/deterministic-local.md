---
name: deterministic-local
kind: deterministic
capabilities: [skill-execution]
runtime: node
entrypoint: scripts/agents/deterministic-local.mjs
metadata:
  automate/promises:
    - "Given a SKILL.md with a `## Comment template` section and a `## Fact to emit` JSON block, I will return {comment, fact} with `{var}` substitutions from the `with:` inputs applied."
    - "I will not call external services. Side effects (posting the PR comment, writing the fact) are the adapter's responsibility."
    - "My output will validate against the skill's `automate/outputSchema`. If I cannot produce a valid output I will fail loudly, not silently."
  automate/how-to-request:
    via: fact-log
    request-kind: WorkRequested
    request-payload:
      skill: <slug>
      inputs: <object matching skill automate/inputSchema>
      agent: deterministic-local
    response-kind: WorkDone
    response-payload: <object matching skill automate/outputSchema>
---

# Agent: Deterministic Local

A zero-dependency Node.js executor. Reads `SKILL.md`, finds the `Comment template`
and `Fact to emit` sections, runs `{var}` substitution against the inputs, returns
the result. Cheap, fast, reliable — and interchangeable with an LLM agent at the
engine level.

## Why this is the first agent

The pitch: the same lifecycle yaml, the same skill files, the same fact log,
routed to a different agent, yields different behavior. Deterministic is just
the cheapest implementation of the "skill-execution" capability.
