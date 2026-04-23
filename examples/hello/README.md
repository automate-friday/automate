# hello — Chapter 1

**One agent writing to a fact log with a skill.**

The smallest real instance of the framework: one skill, one agent, one log,
and a git adapter that makes every append a commit.

## Layout

```
examples/hello/
├── run.ts                                    ← the bun-local agent's code
└── .auto/
    ├── skills/heartbeat/
    │   ├── SKILL.md                          ← natural-language instructions
    │   └── log.jsonl                         ← the skill's own log (JSONL)
    ├── agents/
    │   └── bun-local.md                      ← the one agent, declared
    └── adapters/
        └── git-run                           ← pull → run → commit → push
```

## The three primitives, one each

- **Skill** — `.auto/skills/heartbeat/SKILL.md`. Pure natural language. It
  declares the log format (minimum default: `{id, at, by, kind, payload}`)
  and what "running the skill" means (append one line to `log.jsonl`).
- **Agent** — `bun-local`. A deterministic bun process whose code is in
  `run.ts`. Declared in `.auto/agents/bun-local.md`.
- **Fact log** — `.auto/skills/heartbeat/log.jsonl`. Owned by the skill.
  First line is Genesis (the record of the skill being created). Every
  subsequent line is a Ran fact appended by an agent.

## Run it (local-only)

```
cd examples/hello
AGENT=bun-local bun run.ts
```

Appends one Ran fact to `.auto/skills/heartbeat/log.jsonl`. No commit, no push.

## Run it (git-native)

```
cd examples/hello
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
