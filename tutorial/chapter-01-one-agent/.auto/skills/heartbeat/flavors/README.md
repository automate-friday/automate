# flavors — skill-safety spectrum for `heartbeat`

Three representations of the same skill. The natural-language intent is
identical across all three. What changes is **how the skill declares its
input/output contracts** — from nothing at all up to Zod-typed TypeScript.

| flavor file | declares | when to use |
|---|---|---|
| `SKILL_vanilla.md` | `name` + `description` + prose body | early exploration; Anthropic-pure |
| `SKILL_automate.md` | + JSON Schema under `metadata.automate/{inputSchema, outputSchema}` | machine-checkable contracts in any language |
| `SKILL_automate_zod.md` | + references to Zod schemas in `schemas.ts` | static TS inference + composable schemas |

## The superset rule

Every flavor is a **strict superset** of the previous one. An Anthropic-
compatible loader reads `name` + `description` and stops — it never sees
`metadata`, so the `automate` flavor is still Anthropic-compatible. The Zod
flavor is the Automate flavor with the inline schema replaced by a module
reference — the contract is equivalent, the storage format differs.

## Chapter 1 uses vanilla

Chapter 1 is about the minimum composition: one agent, one skill, one log.
Adding schemas would be ceremony that obscures the primitives. The vanilla
flavor is the canonical chapter-1 entry point. Later chapters may adopt the
automate or zod flavors as contracts stabilise.

## Upgrade path

- Vanilla → Automate: add `metadata.automate/inputSchema` and
  `metadata.automate/outputSchema` blocks with JSON Schema. The prose stays
  identical.
- Automate → Zod: move the schemas into a TypeScript module, replace each
  schema block with `{kind: zod, module, export}`. The contract stays
  equivalent; the storage moves from YAML to TS.

Every step up in safety is opt-in. The skill never *requires* schemas — they
are declarations a runtime may use to validate.
