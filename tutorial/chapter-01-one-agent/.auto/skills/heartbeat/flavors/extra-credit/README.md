# Extra credit — the fact shape, in every schema language

The three canonical flavors (`vanilla`, `automate`, `automate_zod`) cover the
spectrum from "nothing" to "TS-typed". This folder shows the *same contract*
expressed in every other schema language you might already have in your stack.

The point: the skill's intent is one paragraph of English. The shape is
`{id, at, by, kind, payload}`. **Which declarative language you reach for is a
local choice.** Frontmatter references an external file; the runtime validator
loads it.

## The generic pattern

Every flavor reduces to three choices:

1. **Declare** the shape in some schema dialect.
2. **Reference** it from `metadata.automate/outputSchema` as
   `{kind, module|path, export?}`.
3. **Validate** at publish time — the adapter picks a validator for the
   `kind`.

Step 2 is identical across languages. Step 1 is the only real difference.

## Catalog

| Flavor | Language | `kind` value | Companion file |
|---|---|---|---|
| [protobuf](./SKILL_protobuf.md) | Protocol Buffers | `proto` | `heartbeat.proto` |
| [avro](./SKILL_avro.md) | Apache Avro | `avro` | `heartbeat.avsc` |
| [typespec](./SKILL_typespec.md) | TypeSpec (Cadl) | `typespec` | `heartbeat.tsp` |
| [graphql](./SKILL_graphql.md) | GraphQL SDL | `graphql` | `heartbeat.graphql` |
| [openapi](./SKILL_openapi.md) | OpenAPI component | `openapi` | `heartbeat.yaml` |
| [jsonld](./SKILL_jsonld.md) | JSON-LD / schema.org | `jsonld` | inline `@context` |
| [dts](./SKILL_dts.md) | TypeScript `.d.ts` | `dts` | `heartbeat.d.ts` |
| [pydantic](./SKILL_pydantic.md) | Pydantic (Python) | `pydantic` | `heartbeat.py` |
| [ecto](./SKILL_ecto.md) | Ecto changeset (Elixir) | `ecto` | `heartbeat.ex` |
| [joi](./SKILL_joi.md) | Joi (JavaScript) | `joi` | `heartbeat.joi.js` |
| [yup](./SKILL_yup.md) | yup | `yup` | `heartbeat.yup.ts` |
| [valibot](./SKILL_valibot.md) | valibot | `valibot` | `heartbeat.valibot.ts` |

## The hard part is the registry; everything else is ~5 lines

An Automate runtime keeps a table of `kind -> validator`. Add a new schema
language, you add one entry:

```ts
validators.register("protobuf", loadProto);
validators.register("avro",     loadAvsc);
// ...
```

Every new flavor is then a frontmatter edit plus a companion file. The skill's
prose doesn't change. The log doesn't change. Agents don't change. The
*contract expression* is the only thing that moves.

## Contract equivalence

All twelve flavors in this folder describe the same shape as the canonical
`SKILL_automate.md`. A fact valid under one is valid under all. Pick the
language your team already speaks — there's no "right" one.
