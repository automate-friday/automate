---
name: welcome-new-contributor
description: Post a first-time welcome comment on a contributor's PR and emit a Greeted fact.
metadata:
  automate/inputSchema:
    type: object
    properties:
      author:
        type: string
        description: GitHub handle of the PR author (no @ prefix).
      pr_number:
        type: integer
        description: The pull request number.
    required: [author, pr_number]
  automate/outputSchema:
    type: object
    properties:
      comment:
        type: string
        description: Markdown body to post on the PR.
      fact:
        type: object
        properties:
          kind:
            type: string
            const: Greeted
          payload:
            type: object
            properties:
              author: { type: string }
              pr_number: { type: integer }
              tier: { type: string, const: "first-time" }
            required: [author, pr_number, tier]
        required: [kind, payload]
    required: [comment, fact]
---

# Welcome New Contributor

Render a warm first-time welcome for the PR author. Referenced template below;
a deterministic agent performs `{var}` substitution, an LLM agent may rewrite
it freely as long as the output matches `automate/outputSchema`.

## Comment template

Hey @{author} — thanks for opening your first PR here! A maintainer will take
a look shortly. While you wait, a few pointers:

- Make sure the PR description explains the *why* behind the change.
- If anything breaks in CI, push a fix on the same branch — no need to close.
- First-time PRs sometimes need a small nudge; ping if it's been a few days.

## Fact to emit

```json
{ "kind": "Greeted", "payload": { "author": "{author}", "pr_number": {pr_number}, "tier": "first-time" } }
```
