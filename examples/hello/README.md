# hello — the smallest fact log

The minimum composition of the three primitives.

- **Skill** — `.auto/skills/heartbeat/SKILL.md` describes the work in plain
  markdown. That's it.
- **Agent** — `run.ts` is a deterministic script that executes the skill.
- **Fact log** — `.auto/facts/` is an append-only directory of JSONL files.
  Every run adds one file.

## Run it

```
bun run.ts
```

Each run appends one fact. Over time, `.auto/facts/` grows. That *is* the
memory — no database, no runtime, no reducer.

## Layout

```
examples/hello/
├── .auto/
│   ├── skills/heartbeat/SKILL.md
│   └── facts/                    ← grows with every run
└── run.ts                        ← the agent
```

## What's absent and why

- **No engine declaration.** An engine is a declared pattern of fact kinds
  with hooks. This demo has one fact kind and no hooks, so there's no engine
  to declare.
- **No input/output schemas on the skill.** They're an extension for
  contracts at scale; overkill at one run-once script.
- **No GitHub Action.** Not every agent lives in CI. Wiring `.auto/` to
  GitHub is the next example, not this one.

When an absence above stops being OK, the next example adds exactly one
thing. Each new example should earn its additional surface area.
