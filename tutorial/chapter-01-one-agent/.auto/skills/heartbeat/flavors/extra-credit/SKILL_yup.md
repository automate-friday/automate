---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: yup
    module: ./heartbeat.yup.ts
    export: RanSchema
---

# Heartbeat (yup flavor)

Contract is a yup schema — common in Formik / React Hook Form stacks.
Structurally equivalent to Zod; pick whichever your team already uses.

## Companion `heartbeat.yup.ts`

```ts
import * as yup from "yup";

export const PayloadSchema = yup.object({
  runner: yup.string().min(1).required(),
}).noUnknown().strict();

export const RanSchema = yup.object({
  id:   yup.string().matches(/^[0-9a-f]{12}$/).required(),
  at:   yup.string().required(),
  by:   yup.string().min(1).required(),
  kind: yup.mixed<"Ran">().oneOf(["Ran"]).required(),
  payload: PayloadSchema.required(),
}).noUnknown().strict();

export type Ran = yup.InferType<typeof RanSchema>;
```

## When to use this flavor

- Your frontend already uses yup for form validation; share the schema.
- You want `yup.InferType` inference without adopting Zod.
- The fact shape is also a form shape somewhere (user manually submits a
  heartbeat via a React form).
