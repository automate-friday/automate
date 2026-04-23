---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: avro
    file: ./heartbeat.avsc
    record: Ran
---

# Heartbeat (Avro flavor)

Contract is an Avro schema file (`.avsc`). Avro emphasises schema evolution:
facts in the log can be upgraded with reader/writer schema pairs without
breaking old agents.

## Companion `heartbeat.avsc`

```json
{
  "type": "record",
  "name": "Ran",
  "namespace": "heartbeat",
  "fields": [
    { "name": "id",   "type": "string" },
    { "name": "at",   "type": "string" },
    { "name": "by",   "type": "string" },
    { "name": "kind", "type": { "type": "enum", "name": "Kind", "symbols": ["Ran"] } },
    { "name": "payload", "type": {
        "type": "record", "name": "Payload",
        "fields": [ { "name": "runner", "type": "string" } ]
    } }
  ]
}
```

## When to use this flavor

- You're already on Kafka / Confluent Schema Registry.
- Schema evolution is a first-class concern (renamed fields, defaults, aliases).
- You want cross-language codegen from a single `.avsc`.
