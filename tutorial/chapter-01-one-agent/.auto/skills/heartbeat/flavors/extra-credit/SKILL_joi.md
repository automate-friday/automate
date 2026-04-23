---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: joi
    module: ./heartbeat.joi.js
    export: RanSchema
---

# Heartbeat (Joi flavor)

Contract is a Joi schema (Hapi ecosystem). Joi predates Zod; if your
Node.js codebase already uses it, reuse it here.

## Companion `heartbeat.joi.js`

```js
const Joi = require("joi");

const Payload = Joi.object({
  runner: Joi.string().min(1).required(),
});

const RanSchema = Joi.object({
  id:   Joi.string().pattern(/^[0-9a-f]{12}$/).required(),
  at:   Joi.string().isoDate().required(),
  by:   Joi.string().min(1).required(),
  kind: Joi.string().valid("Ran").required(),
  payload: Payload.required(),
});

module.exports = { RanSchema };
```

## When to use this flavor

- Pre-existing Hapi / Joi codebase.
- You want rich custom validators (IP ranges, credit-card Luhn, etc.) without
  pulling in a second library.
- JSON Schema emission via `joi-to-json` if cross-language agents need it.

No static type inference (Joi is a runtime-only validator); pair with `.d.ts`
if you need editor types.
