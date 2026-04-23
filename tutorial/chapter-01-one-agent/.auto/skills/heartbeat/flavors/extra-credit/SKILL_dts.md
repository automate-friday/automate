---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: dts
    module: ./heartbeat.d.ts
    export: Ran
---

# Heartbeat (TypeScript declaration flavor)

Contract is a `.d.ts` interface. Pure structural types — no runtime validator.
The point is **editor inference**: agents that write facts in TypeScript get
autocomplete and type-checking without pulling in Zod.

## Companion `heartbeat.d.ts`

```ts
export interface Ran {
  /** 12 hex chars */
  id: string;
  /** ISO 8601 */
  at: string;
  by: string;
  kind: "Ran";
  payload: {
    runner: string;
  };
}
```

## When to use this flavor

- You want TS types with zero runtime dependency.
- Validation happens at the adapter boundary (JSON Schema generated from the
  `.d.ts` via `ts-json-schema-generator`, or skipped entirely for trusted
  agents).
- Schema evolution is managed by semantic TypeScript changes (adding optional
  fields, etc.).

This is the minimum declaration that gives a TS agent editor support.
