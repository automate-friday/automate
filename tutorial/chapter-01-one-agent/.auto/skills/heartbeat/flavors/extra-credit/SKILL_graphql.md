---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: graphql
    file: ./heartbeat.graphql
    type: Ran
---

# Heartbeat (GraphQL SDL flavor)

Contract declared as a GraphQL type. Not for querying — for **shape**. SDL is
an underrated schema language: nullability is explicit, unions are clean, and
most stacks already have tooling.

## Companion `heartbeat.graphql`

```graphql
enum Kind { Ran }

type Payload {
  runner: String!
}

type Ran {
  id: String!
  at: String!
  by: String!
  kind: Kind!
  payload: Payload!
}
```

## When to use this flavor

- Your frontend or BFF already speaks GraphQL; reuse the type system.
- You want codegen (graphql-codegen → TS, Swift, Kotlin, Rust).
- Facts might later be exposed as a GraphQL subscription feed.

The `!` non-null markers map cleanly to JSON Schema `required`.
