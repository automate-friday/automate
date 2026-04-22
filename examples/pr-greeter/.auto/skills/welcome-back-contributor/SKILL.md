---
name: welcome-back-contributor
description: Post a short welcome-back comment on a returning contributor's PR and emit a Greeted fact.
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
      prior_count:
        type: integer
        description: Number of prior Greeted facts for this author.
    required: [author, pr_number, prior_count]
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
              tier: { type: string, const: "returning" }
              prior_count: { type: integer }
            required: [author, pr_number, tier, prior_count]
        required: [kind, payload]
    required: [comment, fact]
---

# Welcome Back Contributor

Short acknowledgment for a returning contributor. The deterministic agent
substitutes `{var}`; an LLM agent may rewrite as long as the output matches
`automate/outputSchema`.

## Comment template

Welcome back, @{author}. PR #{pr_number} is your {prior_count_ordinal} here —
always glad to see a familiar name.

## Fact to emit

```json
{ "kind": "Greeted", "payload": { "author": "{author}", "pr_number": {pr_number}, "tier": "returning", "prior_count": {prior_count} } }
```
