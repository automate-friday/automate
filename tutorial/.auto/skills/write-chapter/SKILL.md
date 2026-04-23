---
name: write-chapter
description: Author a new chapter of the automate-friday tutorial. Each chapter adds exactly one new idea to the three primitives (skill, agent, fact log) composed via git. Any contributor — human or AI — that follows this skill should be able to produce a compliant chapter without further guidance.
metadata:
  automate/authority: human
---

# Write a Tutorial Chapter

The automate-friday tutorial is a progressive walkthrough of a three-primitive
framework: **skill**, **agent**, **fact log** — composed via git. Every chapter
in `tutorial/` adds exactly **one new idea** to the chapter before it. This
skill teaches you how to add the next one.

Read `tutorial/README.md` and the most recent chapter before you start. Your
new chapter is a delta on that one.

## The rules (non-negotiable)

- **Skill + agent + fact log are the only primitives.** No runtime kernel, no
  reactive engine object, no workflow DAG, no orchestrator. If you feel you
  need one, you have misunderstood — re-read chapters 1-4.
- **One new thing per chapter.** Not two. If the delta is "new skill + new
  agent kind + new adapter", split it across chapters.
- **The skill owns its log.** `.auto/skills/<name>/log.jsonl`. First line is
  always Genesis. No exceptions.
- **Facts are `{id, at, by, kind, payload}`.** Nothing else is stored. Derived
  values (position, predecessors, counts) are computed by reading the log, not
  persisted.
- **Skills are natural-language first.** SKILL.md is an Anthropic-compatible
  file. Extensions live under `metadata.automate/*` so Anthropic loaders still
  see only `name` + `description`.
- **Agents are `.md` files**, registered in `.auto/agents/`. Frontmatter
  declares `name`, `kind`, `capabilities`, `executes`, and — where relevant —
  `authority`, `pattern`, `status`.
- **Never push to main.** Ever. Commit locally on a feature branch; get
  explicit human approval before pushing.

## Folder layout a chapter must produce

```
tutorial/chapter-<NN>-<slug>/
├── README.md                                ← delta + layout + run instructions
├── run.ts | counter.ts | <verb>.ts          ← optional, only if deterministic
└── .auto/
    ├── skills/<skill-name>/
    │   ├── SKILL.md                         ← the contract (natural language)
    │   ├── log.jsonl                        ← starts with one Genesis line
    │   └── flavors/                         ← optional: vanilla / automate / automate+zod
    ├── agents/
    │   └── <agent>.md                       ← one file per registered agent
    └── adapters/
        └── git-run                          ← usually a copy of the prior chapter's
```

Only create `flavors/` when the safety progression is what the chapter is
teaching. Don't add it by default.

## SKILL.md shape

Minimum — vanilla, Anthropic-pure:

```markdown
---
name: <skill-name>
description: <one sentence; what it does and who may fulfil it>
---

# <Title>

<Prose: what the skill does, what fact shape it appends, the protocol>
```

Add `metadata.automate/*` extensions **only when the chapter's new idea
requires them**. Examples already in the tree:

- `metadata.automate/inputSchema` + `outputSchema` — JSON Schema contracts
  (chapter 1's `automate` flavor).
- `metadata.automate/authority: human` — governance (chapter 3).

Document every extension in the chapter's README so readers see *why* it is
there. If you are inventing a new `metadata.automate/*` key, stop — that is a
framework change, not a tutorial chapter. Raise it separately.

## Fact log — Genesis and beyond

Every `log.jsonl` starts with exactly one Genesis fact:

```json
{"id":"genesis00001","at":"2026-04-23T00:00:00.000Z","by":"<creator>","kind":"Genesis","payload":{"skill":"<skill-name>","description":"<why this skill exists>"}}
```

Subsequent lines are appended by agents as they fulfil the skill. The payload
shape varies per skill; the `{id, at, by, kind, payload}` envelope does not.
`id` is 12 hex chars of `sha256(at + runner + by)` truncated, except for
Genesis which is hand-written (`genesis00001` etc.).

**Do not** store derived fields. If a reader needs to know "what count are we
on?" they fold the log to answer. The log is history; state is a view over it.

## Agent registration shape

`.auto/agents/<name>.md`:

```markdown
---
name: <agent-id>
kind: deterministic | llm | human
capabilities: [skill-execution, ...]
executes:
  - <skill-name>
# optional:
authority: default | human
pattern: A | B | C          # A=direct push, B=webhook bridge, C=IaC
status: concept | stub | runnable
---

# Agent: <agent-id>

<Prose: what this runtime is, how it reads the skill, how it publishes the fact>

## Invocation

<One copy-pasteable command block>
```

`kind` is the runtime category. `authority` is used only in chapters 3+ where
governance applies. `pattern` + `status` are used in chapter 2's extra-credit
catalog.

## README structure a chapter must follow

1. **Title + one-sentence hook** — "Chapter N — <the new idea>".
2. **The delta from the previous chapter** — explicit. "Nothing in the skill
   changes; what changes is X." or "The skill gains a new frontmatter field."
3. **Layout tree** — copy the `tree`-style block, matching reality.
4. **The three primitives, one each** — rename sections if needed, but every
   chapter should restate skill / agent / log so a reader landing on any
   chapter sees the primitives.
5. **Run it** — concrete shell commands. If there is a local-only path and a
   git-native path, show both.
6. **What this validates** — 3-5 bullets on what the new idea proves.
7. **What's next** — one-sentence pointer to the next chapter (or a placeholder
   if it's the latest).

Keep sections short. Short paragraphs, small code blocks, tables where they
help. No wall-of-text.

## The "one new thing" rule, with worked examples

| Chapter | The one thing it adds |
|---|---|
| 1 | Baseline: one agent, one skill, one log, a git adapter. |
| 2 | Heterogeneous agents — script / LLM / human — fulfil the **same** skill. |
| 3 | Governance — skill declares `automate/authority`; proposals need approval. |
| 4 | Coordination — two agents cooperate via the log alone, no direct channel. |

Candidate chapter 5+ ideas that obey the rule: reactive parameter (Genesis
payload changes while agents run), multi-skill composition (one agent executes
two skills, second reads the first's log), failure/retry semantics, forking /
merging two separate logs. Each of those is exactly one new idea.

**Anti-examples** — do NOT do these:
- "Chapter 5: add a scheduler, retries, and webhook bridge." → three things.
  Pick one.
- "Chapter 5: introduce `Engine` as a new primitive." → adds a primitive.
  Rejected. Compose with skill + agent + log or it doesn't belong.
- "Chapter 5: skill with no Genesis because it's lightweight." → breaks the
  fact log contract. Every skill has Genesis.

## Smoke test before committing

Before `git commit`:

1. `cat tutorial/chapter-NN-<slug>/.auto/skills/<skill>/log.jsonl | head -1`
   — must parse as JSON and have `kind: "Genesis"`.
2. If there is a `run.ts`/`counter.ts`: execute it from the chapter's
   directory and confirm a second line appears with `{id, at, by, kind,
   payload}` and nothing else.
3. Every `.auto/agents/*.md` has `name`, `kind`, `executes`. The `executes`
   value matches a real skill folder name in this chapter.
4. `README.md` mentions the delta explicitly in the first two paragraphs.
5. No file outside `tutorial/chapter-NN-<slug>/` has been modified — chapters
   are additive and isolated.

If any step fails, fix it before committing.

## Commit + push procedure

```sh
# From repo root
git checkout -b tutorial/chapter-NN-<slug>
git add tutorial/chapter-NN-<slug>
git commit -m "tutorial/chapter-NN: <slug> — <one-line delta>"
# STOP. Do not push.
```

**Never push to `main`.** Always a feature branch. Before pushing the branch,
ask the human for explicit approval. If you are an AI agent, surface the diff
and the intended remote + branch name and wait.

## Common pitfalls

- **Confusing skill with agent.** The skill is *what* and *how to record it*;
  the agent is *who runs it*. If the thing you are writing has an
  `executes:` field, it's an agent. If it has a log, it's a skill.
- **Storing derived fields in the log.** Don't. `position`, `predecessor`,
  `count` are views. Only raw facts go in.
- **Introducing a runtime kernel.** "I'll just add a small dispatcher / engine
  object / workflow runner." No. If composition needs more than skill + agent
  + log + git, the tutorial's thesis is wrong, not the primitives.
- **Skill with no Genesis.** Every `log.jsonl` starts with one.
- **Agent registration without an `executes:`.** An agent that doesn't execute
  a skill is scaffolding, not an agent. Delete it.
- **Two new things in one chapter.** Split.
- **Modifying earlier chapters.** Chapters are historical artifacts once
  merged. If a convention changes, write a new chapter that demonstrates the
  change; don't rewrite chapter 1.
- **Pushing without asking.** Zero exceptions.

## Minimum viable contributor loop

1. Read `tutorial/README.md` + the latest chapter.
2. Name the one new idea in a single sentence.
3. `mkdir tutorial/chapter-NN-<slug>` and the `.auto/` tree.
4. Write SKILL.md. Seed `log.jsonl` with Genesis.
5. Write one agent registration per runtime involved.
6. Write README.md. Use the structure above.
7. Smoke test (5 steps above).
8. Commit on a feature branch. Wait for human approval before pushing.

If you can do all eight steps without adding a new primitive, you have a
compliant chapter.
