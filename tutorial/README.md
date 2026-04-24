# automate-friday — tutorial

An eight-chapter walk through the framework's four primitives: **skill**,
**agent**, **fact log**, **engine**. Each chapter adds exactly one thing
to the one before. Read them in order.

| | Chapter | Adds |
|---|---|---|
| 1 | **one agent** — a single deterministic agent runs a single skill; the skill owns its log; a git adapter makes every append a commit. | the baseline |
| 2 | **any agent** — same skill, same log, different kinds of agents (scripts, LLMs, humans) all contribute. | heterogeneous agents |
| 3 | **governance** — the skill declares `automate/authority: human`; lower-authority agents can only *propose*, must get approval. | PR-based merge as approval |
| 4 | **two agents cooperating** — two remote agents count from 1 to 10 through the fact log alone; no direct communication. | coordination via shared log |
| 5 | **reactive parameter** — the counting target lives in the log as a `TargetChanged` fact; agents react on their next tick. | runtime parameters in the log |
| 6 | **test harness** — `reset.sh` forks a log back to Genesis; `harness.ts` replays a scenario and asserts the terminal state. | deterministic regression tests |
| 7 | **even and odd** — two *different* skills composed inside one engine, each with its own instance log; engine as first-class primitive. | two skills, one engine |
| 8 | **composability** — one skill reused in two engines, each with its own instance log; framework-owned projection skill maintains a per-skill-version index. Versioning and tenancy in the path. | one skill, many engines |

## The four primitives (repeated in every chapter)

- **Skill** — natural-language instructions in a SKILL.md. It declares what
  to do and what fact shape to append. That's it.
- **Agent** — any runtime that can execute a skill (a script, an LLM, a
  human, another machine). Registered in `.auto/agents/<name>.md`.
- **Fact log** — append-only JSONL. First line is always Genesis. In
  chapters 1–6 each skill has one log at `.auto/skills/<skill>/log.jsonl`.
  Chapter 8 refines this: logs are **instance state** (per skill-use inside
  an engine), not **definition state** (one global log per skill).
- **Engine** — a composition of skills with a declared lifecycle.
  Introduced in chapter 7. Engines run continuously and self-heal.
  Workflows (a later chapter) are a special case: a one-shot engine that
  terminates once its skills reach a terminal state.

## The framework you see

Each chapter ships the same ~30 lines of adapter code (`git-run`) plus one
TypeScript file per agent kind. Nothing else. There is no runtime kernel
before chapter 7; composition happens through skills, agents reading and
writing the log, and git itself. Chapter 7 introduces the engine as a
composition primitive — an ENGINE.md + a tick loop — still without a
runtime kernel of its own.

## How to read a chapter

1. Open `SKILL.md`. Read it — that's the contract.
2. Open `log.jsonl`. Read it — that's the history.
3. Open `.auto/agents/*.md`. Each lists who can contribute.
4. If you want to run it: the chapter's README shows how.

## Future chapters (roadmap — not yet written)

Ideas to explore once the first six chapters settle. None of this exists yet;
each line is a placeholder for a future chapter.

- **Publishing a log** — making a log addressable/discoverable beyond the
  local repo so others can read it.
- **Replicating a log** — another party pulls a published log and keeps a
  local mirror in sync.
- **Reactive agents** — agents that subscribe to a log and tick on append
  instead of polling (likely where the rxjs research lands).
- **Duplicating a log** — forking a log's history into a new skill/log while
  preserving provenance back to the source.
- **First third-party authors** — someone outside this repo writes their own
  skill + log from scratch using only the published primitives.
- **Forking the project** — a downstream fork of the whole framework; what
  must stay stable for their skills/agents/logs to keep working.
- **Self-registration** — an agent registers itself (capabilities, authority,
  identity) into a log rather than being placed by a human.
- **Registering others' setups** — pointing at someone else's agents, skills,
  or logs and adopting them into your own runtime (trust + discovery).
- **Research report: rxjs & observables** — survey of the observable model
  (rxjs, Solid signals, Effect Stream) against the fact-log-as-stream shape;
  informs the reactive-agents chapter.
