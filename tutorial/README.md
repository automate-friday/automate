# automate-friday — tutorial

A four-chapter walk through the framework's three primitives: **skill**,
**agent**, **fact log**. Each chapter adds exactly one thing to the one
before. Read them in order.

| | Chapter | Adds |
|---|---|---|
| 1 | **one agent** — a single deterministic agent runs a single skill; the skill owns its log; a git adapter makes every append a commit. | the baseline |
| 2 | **any agent** — same skill, same log, different kinds of agents (scripts, LLMs, humans) all contribute. | heterogeneous agents |
| 3 | **governance** — the skill declares `automate/authority: human`; lower-authority agents can only *propose*, must get approval. | PR-based merge as approval |
| 4 | **two agents cooperating** — two remote agents count from 1 to 10 through the fact log alone; no direct communication. | coordination via shared log |

## The three primitives (repeated in every chapter)

- **Skill** — natural-language instructions in a SKILL.md. It declares what
  to do and what fact shape to append. That's it.
- **Agent** — any runtime that can execute a skill (a script, an LLM, a
  human, another machine). Registered in `.auto/agents/<name>.md`.
- **Fact log** — append-only JSONL the skill owns. Lives with the skill at
  `.auto/skills/<skill>/log.jsonl`. First line is always Genesis.

## The framework you see

Each chapter ships the same ~30 lines of adapter code (`git-run`) plus one
TypeScript file per agent kind. Nothing else. There's no runtime kernel, no
reactive reducer, no workflow engine — those are not primitives. Composition
happens through skills, agents reading and writing the log, and git itself.

## How to read a chapter

1. Open `SKILL.md`. Read it — that's the contract.
2. Open `log.jsonl`. Read it — that's the history.
3. Open `.auto/agents/*.md`. Each lists who can contribute.
4. If you want to run it: the chapter's README shows how.
