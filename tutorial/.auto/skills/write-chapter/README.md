# write-chapter — meta-skill

The tutorial teaches itself. This folder holds the skill that teaches
someone how to **write the next chapter** of `tutorial/` without drifting from
the three-primitive thesis.

- **Contract** → [`SKILL.md`](./SKILL.md). Read this first. It's the full
  procedure: folder layout, SKILL.md shape, fact log rules, agent
  registration, README structure, smoke test, commit/push procedure, and the
  common pitfalls.
- **History** → [`log.jsonl`](./log.jsonl). Genesis line plus one fact per
  chapter authored through this skill (none yet; future contributors append
  a `Ran` fact after each chapter ships).
- **Flavors (optional)** → [`flavors/`](./flavors/). The meta-skill itself
  demonstrated at the same vanilla / automate safety levels the tutorial
  teaches. `SKILL.md` at the top is the vanilla form; `flavors/` mirrors
  chapter 1's structure for pedagogical symmetry.

## When to invoke this skill

- You are about to add `tutorial/chapter-NN-<slug>/`.
- You are reviewing a draft chapter and want to check it against the rules.
- You are onboarding a new contributor (human or AI) and want them to write a
  chapter unsupervised.

## Fact shape for this skill's log

When a contributor finishes a chapter using this skill, append:

```json
{
  "id": "<12 hex>",
  "at": "<ISO 8601>",
  "by": "<contributor id>",
  "kind": "Ran",
  "payload": {
    "chapter": "chapter-NN-<slug>",
    "oneNewThing": "<single sentence describing the delta>",
    "approvedBy": "<human approver>"
  }
}
```

That fact becomes part of the record of how the tutorial grew.
