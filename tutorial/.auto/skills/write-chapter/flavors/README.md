# flavors — safety spectrum for `write-chapter`

Same skill, two representations. Mirrors the chapter-1 flavors pattern so the
meta-skill eats its own dog food.

| flavor file | declares | when to use |
|---|---|---|
| `SKILL_vanilla.md` | `name` + `description` + prose body | default; what the top-level `SKILL.md` is |
| `SKILL_automate.md` | + `metadata.automate/authority: human` | enforces that publishing a chapter requires human approval |

## The superset rule

Every flavor is a strict superset of the previous one. Anthropic loaders read
`name` + `description` and stop — they never see `metadata`, so both flavors
stay Anthropic-compatible.

## Which one is live?

The top-level `../SKILL.md` currently matches `SKILL_automate.md` — governance
is the whole point of this skill (never push without approval), so the
`automate/authority: human` field is part of the contract, not an optional
add-on. `SKILL_vanilla.md` is kept as a reference so readers can see the
upgrade path.
