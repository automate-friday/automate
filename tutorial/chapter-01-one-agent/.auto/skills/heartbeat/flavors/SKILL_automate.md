---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/inputSchema:
    type: object
    properties: {}
    additionalProperties: false
  automate/outputSchema:
    type: object
    required: [id, at, by, kind, payload]
    additionalProperties: false
    properties:
      id:
        type: string
        pattern: "^[0-9a-f]{12}$"
      at:
        type: string
        format: date-time
      by:
        type: string
        minLength: 1
      kind:
        type: string
        const: Ran
      payload:
        type: object
        required: [runner]
        additionalProperties: false
        properties:
          runner:
            type: string
            minLength: 1
---

# Heartbeat (automate flavor)

Same skill as vanilla, with **machine-checkable contracts** added under
`metadata.automate/*`. Anthropic tools still see only `name` + `description`;
Automate-aware tools validate every appended fact against `outputSchema`.

## What changes vs vanilla

- `metadata.automate/inputSchema` — this skill takes no structured input.
  The empty object schema is explicit about that.
- `metadata.automate/outputSchema` — the Ran fact shape is a JSON Schema. Any
  runtime can validate "does this agent's output actually conform?" without
  reading the prose below.

## When to use this flavor

- You want any language, any tool, to validate facts against the same
  contract (JSON Schema is universal).
- You do not want to pull in Zod or any TypeScript-specific validator.
- You're ready to commit to the fact shape; changes are versioned through the
  skill's own log (same as everything else).

The natural-language body is still the source of truth for the *intent*; the
schema is the source of truth for the *shape*.
