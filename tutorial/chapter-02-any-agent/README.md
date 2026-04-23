# Chapter 2 — any agent can fulfil the skill

**Same skill as Chapter 1. Same log. Different kinds of agents.**

## The delta from Chapter 1

Nothing in the skill changes. What changes is:
- **More agent registrations** in `.auto/agents/` — `bun-local` (deterministic
  script), `claude-code-local` (an LLM), `human-terminal` (a human typing).
- **The log has more lines**, each tagged with whoever showed up.

## Read the log

```
{ Genesis              by: jacob            }
{ Ran                  by: bun-local        }     ← deterministic script
{ Ran                  by: claude-code-local }    ← an LLM wrote it
{ Ran                  by: human-terminal   }     ← someone typed it by hand
```

All three Ran facts have identical shape. They agree on the skill's contract
(format declared in SKILL.md). They differ only in `by` and `at`. The skill
doesn't prefer any one of them; the log records all three equally.

## What this validates

- Skills are declarative. Every runtime that can read natural language can
  fulfil them.
- Agents are runtimes. Humans, LLMs, scripts — all the same kind of thing
  from the skill's point of view.
- The log is the shared record. It doesn't care who wrote; it just accepts.

## What's next

- **Chapter 3** — governance. Now that many agents can write, we need a way
  to say which ones are allowed to commit unilaterally and which need
  approval. The fact log itself is where that happens, via PR-based merge.
