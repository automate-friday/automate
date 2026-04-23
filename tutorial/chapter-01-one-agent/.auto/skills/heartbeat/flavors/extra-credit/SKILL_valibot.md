---
name: heartbeat
description: Record that an agent ran you. Any agent may fulfil this.
metadata:
  automate/outputSchema:
    kind: valibot
    module: ./heartbeat.valibot.ts
    export: RanSchema
---

# Heartbeat (valibot flavor)

Contract is a valibot schema. valibot is Zod's tree-shakable sibling — each
validator is its own import, so bundled agents (edge functions, browser
runtimes) ship only the pieces they use.

## Companion `heartbeat.valibot.ts`

```ts
import * as v from "valibot";

export const PayloadSchema = v.object({
  runner: v.pipe(v.string(), v.minLength(1)),
});

export const RanSchema = v.object({
  id:   v.pipe(v.string(), v.regex(/^[0-9a-f]{12}$/)),
  at:   v.pipe(v.string(), v.isoTimestamp()),
  by:   v.pipe(v.string(), v.minLength(1)),
  kind: v.literal("Ran"),
  payload: PayloadSchema,
});

export type Ran = v.InferOutput<typeof RanSchema>;
```

## When to use this flavor

- Bundle size matters (edge runtimes, mobile, browser agents).
- You want modern Zod-style inference with better tree-shaking.
- Fact validation runs inside a Cloudflare Worker / Vercel Edge function.

Contract equivalence with the canonical `automate_zod` flavor — the
validator chosen is a runtime deployment decision.
