---
name: write-chapter
description: Author a new chapter of the automate-friday tutorial. Each chapter adds exactly one new idea to the three primitives (skill, agent, fact log) composed via git.
---

# Write a Tutorial Chapter (vanilla flavor)

Pure Anthropic shape. No `metadata.automate/*` — this flavor treats the skill
as an unprivileged tutorial-author playbook. See the top-level `SKILL.md` for
the live, governed version (which adds `automate/authority: human`).

The full procedure (folder layout, SKILL.md shape, fact log rules, agent
registration, README structure, smoke test, commit/push procedure, and common
pitfalls) is identical to the top-level `SKILL.md`. This flavor exists only to
document the Anthropic-pure representation; the prose is intentionally not
duplicated here.

Read `../SKILL.md` for the content. Use **this** flavor when you are
exploring the shape of the tutorial and have not yet committed to the "chapter
publishing requires human approval" rule.
