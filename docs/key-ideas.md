# Key Ideas — Automate Friday Framework

The framework delivers two values. Everything in the DSL, runtime, and documentation either serves one of these or gets cut.

## The two core values

### 1. Declarative progressive automation

The same skill should be fulfillable today by a human, tomorrow by an AI agent, next month by a deterministic script — **without the skill definition changing**. Trust graduation is a governance rule that relaxes approval requirements as track record accumulates. What changes is the provider; the skill stays declarative.

### 2. Decentralized collaboration with deterministic governance

Parties collaborate on workflows by sharing an append-only log of facts. Nobody commands anybody. The framework is an **opinionated orchestrator** that reads declared rules and enforces them deterministically — refusing to proceed when gates aren't satisfied, logging every decision for audit. Governance is the product; the log is the substrate.

Everything else in the framework is secondary to, and in service of, these two.

---

## The three-layer model

```
┌─────────────────────────────────────────────────────┐
│  Layer 3 — Governance (opinionated orchestrator)     │
│  Reads rules from skill frontmatter, enforces them,  │
│  logs every step, refuses when gates fail.           │
├─────────────────────────────────────────────────────┤
│  Layer 2 — Primitives (two of them)                  │
│  auto.skill  → generates SKILL.md                    │
│  auto.agent  → registers a provider in the registry  │
├─────────────────────────────────────────────────────┤
│  Layer 1 — Substrate (three things)                  │
│  Skill registry   — markdown files                   │
│  Agent registry   — who provides what                │
│  Shared log       — append-only proof substrate      │
└─────────────────────────────────────────────────────┘
```

**Layer 1 is the minimum viable framework.** If you only have markdown skills, an agent registry, and an append-only log, you already have something useful: you can organize your work, track who did it, and prove it happened.

**Layer 2 is the DSL ergonomics.** Two primitives. `auto.skill` generates a SKILL.md. `auto.agent` advertises what an entity provides. Nothing else is a primitive.

**Layer 3 is the governance orchestrator.** This is what the framework uniquely provides on top of the substrate. You declare rules in skill frontmatter (`requires_approval`, `steps`, `requires`). The orchestrator runs, reads rules, enforces them, logs proof.

## Skills are the base primitive

Everything in the DSL orbits the skill. **A skill is a declarative description of a unit of work to be done** — no more, no less. It names the work, describes it, and optionally declares governance rules (who approves, what sub-skills it composes, what tools it uses).

Because skills are declarative and executor-agnostic:

- The same skill can be fulfilled by a human, an AI agent, or a deterministic script. The skill definition never changes; only the agent registered to provide it.
- Skills travel. A skill in your log can be copied into another party's log and their agents can provide it.
- **Skills are useful even when you work alone.** Writing your work as skills organizes your own labor and gives an audit trail. Agents are what happens when you share or scale — but the skill value exists from day one.

## Agents are providers

An agent advertises which skills it provides. Agent kinds:

- **human** — a person who does the work (via UI, CLI, inbox task, mobile notification)
- **ai** — an AI agent (Claude, a local model, etc.) that does the work
- **script** — a deterministic code path that does the work

The agent's `provides` list declares abstract capability (which skill names they can do). **How** they concretely do the work is their internal business — a webhook POST, an MCP tool call, a human clicking a button, a composed sub-skill. The DSL does not model "how."

## Tools are deterministic skills

A **tool** is a skill whose fulfillment is deterministic: a bash invocation, an API call, a SQL query, an MCP tool. There's no separate "tool" primitive. A tool is just a skill that happens to have a deterministic provider (usually a `script` agent). The vocabulary collapses: agent, skill, tool → really all just agents and skills.

## Composition lives in the skill, as markdown

A composite skill is a SKILL.md with a `steps:` block in its frontmatter:

```yaml
---
name: youtube-to-discord
trigger: youtube

automate-friday:
  steps:
    - skill: summarize-video
      as: summary
    - skill: post-to-discord
      with:
        content: "${summary}"
---
```

The TypeScript DSL helpers (`auto.sequential`, `auto.parallel`, `auto.for`, `auto.switch`) are **optional sugar that generates this frontmatter**. They are not DSL primitives. You can hand-write the markdown and skip the DSL entirely.

If the declarative frontmatter isn't expressive enough for your case, drop into a bash block as the escape hatch:

```markdown
## Script

```bash
VIDEO_ID=$(cat $INPUT | jq -r .videoId)
SUMMARY=$(af call summarize-video --videoId "$VIDEO_ID")
af call post-to-discord --content "$SUMMARY"
```
```

## The current DSL

```typescript
auto.skill(id, {
  description,
  trigger?: sensorId,                 // fires the skill when a sensor event lands
  requires_approval?: role,           // gate: only approved by someone holding this role
  requires?: skillId[],               // sub-capabilities this skill composes with
  steps?: StepList,                   // composition — ordered dispatch of sub-skills
})

auto.agent(id, {
  kind: 'human' | 'ai' | 'script',
  provides: skillId[],                // which skills I advertise I can do
  run: (payload) => Promise<any>,     // how I concretely do them (internal business)
})
```

That's the entire DSL. Two functions. Everything else (governance sugar, approval helpers, composition helpers) is optional.

## Strict superset of the Agent Skills standard

Automate Friday's skill format is a **strict superset** of the [Agent Skills open standard](https://agentskills.io) — the SKILL.md format adopted by Claude Code, Cursor, Copilot, Gemini CLI, Aider, and 30+ other tools. Every valid SKILL.md is a valid Automate Friday skill. Automate Friday adds optional namespaced fields that safely degrade in tools that don't know about them.

### What the base standard defines

| Element | Purpose |
|---|---|
| `SKILL.md` | The skill artifact (required) |
| `name`, `description` (frontmatter) | Required fields per spec |
| `scripts/` | Executable code the agent can run |
| `references/` | Docs loaded on demand |
| `assets/` | Static resources, schemas, data files |

### What Automate Friday adds, namespaced

```yaml
---
name: post-to-discord
description: Post a message to a Discord channel.

automate-friday:
  requires_approval: owner         # approval gate
  requires: [validate-channel]     # sub-skill composition
  steps: [ ... ]                   # for composite skills
---
```

Vanilla Agent Skills tools ignore the `automate-friday` block. Automate Friday's orchestrator reads it and enforces the declared rules.

## The log could be Git

The append-only log is a substrate, not something the framework invents. Any append-only store works:

- A Git repo — each commit is a fact; each skill execution can get its own repo or branch
- A Convex table
- An S3 bucket with object versioning
- A WebSocket stream backed by any persistent log
- A SQLite database with WAL mode

The framework adds **governance rules** on top. The log itself does not enforce anything — the orchestrator enforces by reading skill frontmatter, checking conditions in the projection, and refusing to proceed when a gate isn't satisfied.

## Governance layer — the framework's unique value

Skills declare rules; the framework's orchestrator enforces them. Common rules:

- **`requires_approval: <role>`** — block the dispatch until an agent holding that role appends `DispatchApproved`
- **`steps: [...]`** — dispatch sub-skills in the declared order
- **`requires: [...]`** — this skill composes on top of other skills
- **Rate limits** — a middleware rule that counts recent dispatches and blocks when a threshold is exceeded
- **Reputation gates** — a middleware rule that reads past confirmations and relaxes approval for trusted agents

Governance starts simple (humans read the log and intervene) and becomes deterministic over time (reducer rules). The framework's job is to make governance declarative and provable.

## What stays out (for now)

Dropped from earlier iterations, or deferred to plugin territory:

- **`auto.toolbox` / governed MCP-and-secret access** — moved to [`ROADMAP.md`](ROADMAP.md) as a plugin concept. It is NOT framework core — it's a governance-layer extension with its own design space.
- **`auto.role`** — collapsed. Roles are just skills that only certain agents provide. "Being the owner" means "being an agent that provides `approve-*` skills."
- **`auto.workflow`** — collapsed. A workflow is a composite skill (markdown with `steps:`).
- **`auto.engine`** — collapsed. An engine is an agent that subscribes to the log.
- **`auto.checkpoint`, `auto.transaction`, `auto.module`** — persistence / filesystem concerns belong in the runtime, not the DSL.
- **Chassis supervision tree (Erlang/OTP-style)** — overkill for reactive loops.
- **Four-primitive vision (Skills / Agents / Tools / Tasks)** — Tools are deterministic skills; Tasks are dispatch requests. Both collapse into skills.

The DSL is an iterative artifact. New primitives come back when a real workflow genuinely requires them.

## Why the core stays narrow

Every primitive in the core has to earn its place against two values: **declarative progressive automation** and **decentralized collaboration with deterministic governance**. Things that serve a different concern — even important ones — belong alongside the core, not inside it. This is how the core stays small enough to hold in your head and the framework stays composable at its edges.
