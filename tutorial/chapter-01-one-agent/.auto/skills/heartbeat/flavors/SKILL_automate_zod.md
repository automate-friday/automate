---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/inputSchema:
    kind: zod
    module: ./schemas.ts
    export: HeartbeatInput
  automate/outputSchema:
    kind: zod
    module: ./schemas.ts
    export: HeartbeatOutput
---

# Heartbeat (automate + zod flavor)

Same skill as the automate flavor, but the contracts live in a TypeScript
module — `./schemas.ts` — as Zod schemas. The frontmatter references them
by `{kind, module, export}`.

## What changes vs automate (JSON Schema) flavor

- Inline JSON Schema is replaced by **references** to Zod exports.
- Runtimes that speak TypeScript get static inference for free (the type of
  an output fact is `z.infer<typeof HeartbeatOutput>`).
- Runtimes that don't speak TypeScript can fall back to JSON Schema by
  having Zod emit one (`zod-to-json-schema`) — the contract is equivalent.

## When to use this flavor

- Your agents are TypeScript. You want `HeartbeatOutput` imported and used
  directly in code, not re-derived from JSON Schema.
- You want to compose schemas programmatically (discriminated unions over
  fact kinds, reused fragments, etc.).
- You're okay with the skill's contract needing a TypeScript toolchain to
  fully resolve.

## Contract equivalence

The three flavors describe the same shape. A Ran fact valid under Zod is also
valid under the JSON Schema flavor, and both are valid under the prose in the
vanilla flavor. Flavor choice is about *how the contract is expressed*, not
*what it is*.
