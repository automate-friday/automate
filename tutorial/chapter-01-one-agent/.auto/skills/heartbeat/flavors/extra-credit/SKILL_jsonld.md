---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: jsonld
    context: https://schema.org
    type: Action
---

# Heartbeat (JSON-LD / schema.org flavor)

Contract by **reference** to schema.org's `Action` vocabulary. The fact gains a
`@context` and `@type` and becomes a linked-data document — harvestable by
search engines, semantic agents, SPARQL endpoints.

## Fact shape (JSON-LD form)

```json
{
  "@context": "https://schema.org",
  "@type": "Action",
  "identifier": "a1b2c3d4e5f6",
  "startTime":  "2026-04-22T17:00:00Z",
  "agent":      { "@type": "SoftwareApplication", "name": "bun-local" },
  "actionStatus": "CompletedActionStatus",
  "instrument":   { "@type": "Thing", "name": "runner-hostname" }
}
```

## When to use this flavor

- Facts should be crawlable / indexable by semantic tools.
- You want to align with an existing public vocabulary instead of inventing one.
- Multiple skills will share types (`Person`, `Event`, `Action`) through
  schema.org rather than redefining them locally.

Validation is structural: a JSON-LD processor expands the doc and checks it
against the referenced RDF shape (SHACL, ShEx).
