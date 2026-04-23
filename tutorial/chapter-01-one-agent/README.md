# hello — Chapter 1

**One agent writing to a fact log with a skill.**

The smallest real instance of the framework: one skill, one agent, one log,
and a git adapter that makes every append a commit.

## Layout

```
tutorial/chapter-01-one-agent/
├── run.ts                                    ← the bun-local agent's code
└── .auto/
    ├── skills/heartbeat/
    │   ├── flavors/                          ← three safety-level variants of the skill
    │   │   ├── README.md                     ← explains the progression
    │   │   ├── SKILL_vanilla.md              ← Anthropic-pure: name + description + prose
    │   │   ├── SKILL_automate.md             ← + JSON Schema I/O under metadata.automate/*
    │   │   ├── SKILL_automate_zod.md         ← + Zod contracts via ./schemas.ts
    │   │   └── schemas.ts                    ← Zod definitions used by the _zod flavor
    │   └── log.jsonl                         ← the skill's own log (JSONL)
    ├── agents/
    │   └── bun-local.md                      ← the one agent, declared
    └── adapters/
        └── git-run                           ← pull → run → commit → push
```

## The three primitives, one each

- **Skill** — `.auto/skills/heartbeat/flavors/`. Three representations of the
  same skill at different safety levels; chapter 1 uses the vanilla flavor.
  Every flavor declares what "running the skill" means — append one Ran
  fact to `log.jsonl`. Only the *contract formality* differs.
- **Agent** — `bun-local`. A deterministic bun process whose code is in
  `run.ts`. Declared in `.auto/agents/bun-local.md`.
- **Fact log** — `.auto/skills/heartbeat/log.jsonl`. Owned by the skill.
  First line is Genesis (the record of the skill being created). Every
  subsequent line is a Ran fact appended by an agent.

## Skill safety — three flavors, same skill

This chapter introduces a **flavors** folder so a reader can see the safety
progression right from chapter 1:

- **`SKILL_vanilla.md`** — pure Anthropic shape. No schemas, just name +
  description + prose. Anthropic-compatible with zero extensions.
- **`SKILL_automate.md`** — adds JSON Schema input/output under a namespaced
  `metadata.automate/*` block. Machine-checkable contract, any language.
- **`SKILL_automate_zod.md`** — replaces the inline JSON Schema with
  references to Zod exports in `./schemas.ts`. TypeScript-native, static
  inference, composable.

Every flavor is a **strict superset** of the previous one. Anthropic loaders
only read `name` + `description` — `metadata` is invisible to them, so every
flavor stays Anthropic-compatible. See `flavors/README.md` for the details.

Chapter 1's bun-local agent happens to ignore the schemas (its fact shape is
hardcoded). Later chapters may adopt the automate or zod flavors as runtimes
start validating fact output against the declared contract.

## Run it (local-only)

```
cd tutorial/chapter-01-one-agent
AGENT=bun-local bun run.ts
```

Appends one Ran fact to `.auto/skills/heartbeat/log.jsonl`. No commit, no push.

## Run it (git-native)

```
cd tutorial/chapter-01-one-agent
AGENT=bun-local ./.auto/adapters/git-run bun run.ts
```

The adapter:
1. `git pull --rebase` to get latest.
2. Runs the agent (which appends a fact).
3. `git add` the log, `git commit -m "skill-run: bun-local"`, `git push`.
4. If push was rejected by someone else's concurrent push, rebases and retries.

The remote becomes the source of truth. `git log -- .auto/skills/heartbeat/log.jsonl`
is the fact log's own history.

## What's next (not in Chapter 1)

- **Chapter 2** — *anyone* can run this skill. Same log, many agents (LLM,
  human, remote script). The skill doesn't change; the `by` field records
  who showed up.
- **Chapter 3** — governance. The fact log gates which agents are allowed to
  append what, via PR-based merge instead of direct push, with authority
  levels and approvals.

Each chapter adds exactly one thing to the one before.
