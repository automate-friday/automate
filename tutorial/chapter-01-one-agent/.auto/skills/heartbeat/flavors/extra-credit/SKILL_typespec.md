---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: typespec
    file: ./heartbeat.tsp
    model: Ran
---

# Heartbeat (TypeSpec flavor)

Contract authored in TypeSpec (née Cadl) — Microsoft's TypeScript-flavoured
schema language that compiles down to OpenAPI, JSON Schema, or protobuf.

## Companion `heartbeat.tsp`

```typespec
namespace Heartbeat;

model Payload {
  runner: string;
}

model Ran {
  @pattern("^[0-9a-f]{12}$") id: string;
  @format("date-time")       at: string;
  by: string;
  kind: "Ran";
  payload: Payload;
}
```

## When to use this flavor

- You want one source of truth that can emit OpenAPI + JSON Schema + protobuf
  at build time.
- Your team already uses TypeSpec for API contracts.
- You want decorators for constraints (`@pattern`, `@format`) with static
  checking at author time.

TypeSpec compiles; the compiled JSON Schema is what the validator loads.
