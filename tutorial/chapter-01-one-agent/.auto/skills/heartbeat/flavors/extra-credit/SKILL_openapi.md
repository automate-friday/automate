---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: openapi
    file: ./heartbeat.yaml
    component: Ran
---

# Heartbeat (OpenAPI component flavor)

Contract lives inside an OpenAPI document under `components.schemas.Ran`. The
validator extracts the referenced component and treats it as JSON Schema
(OpenAPI 3.1 schemas *are* JSON Schema 2020-12).

## Companion `heartbeat.yaml`

```yaml
openapi: 3.1.0
info: { title: Heartbeat, version: "1" }
paths: {}
components:
  schemas:
    Ran:
      type: object
      required: [id, at, by, kind, payload]
      properties:
        id:   { type: string, pattern: "^[0-9a-f]{12}$" }
        at:   { type: string, format: date-time }
        by:   { type: string, minLength: 1 }
        kind: { type: string, const: Ran }
        payload:
          type: object
          required: [runner]
          properties:
            runner: { type: string, minLength: 1 }
```

## When to use this flavor

- You already ship an OpenAPI document for your service; the fact shape can
  live right next to your API contracts.
- Your tooling (Stoplight, Redocly, Swagger UI) already renders OpenAPI.
- Facts may later be exposed via an HTTP endpoint the same schema describes.
