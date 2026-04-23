---
name: write-chapter
description: Author a new chapter of the automate-friday tutorial. Each chapter adds exactly one new idea to the three primitives (skill, agent, fact log) composed via git. Publishing requires human approval.
metadata:
  automate/authority: human
---

# Write a Tutorial Chapter (automate flavor)

Same contract as vanilla, with `automate/authority: human` added to the
frontmatter. Any agent may **draft** a chapter (produce the files, run the
smoke test, commit locally on a feature branch). Only a human-authority agent
may **approve the push** that publishes the chapter.

This is the live form of the skill; the top-level `../SKILL.md` matches it.

## What the authority field changes

- A deterministic or LLM agent may follow the full procedure up to — and
  including — the local commit on a feature branch.
- The final `git push` is a governed action. The agent stops and requests
  approval. A human-authority agent (e.g. `jacob`) reviews the diff and
  either pushes themselves or explicitly authorizes the agent to push.
- This is exactly the governance pattern chapter 3 teaches, applied to the
  tutorial's own authoring loop.

## Procedure

Identical to `../SKILL.md`. Do not duplicate; read it there.
