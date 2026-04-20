# Key Ideas — Automate Friday Framework

The framework exists to deliver two values. Everything in the DSL, runtime, and documentation either serves one of these or gets cut.

## The two core values

### 1. Declarative progressive automation

The same skill should be fulfillable today by a human, tomorrow by an AI agent, next month by a deterministic script — **without the skill definition changing**. Trust graduation is a reducer rule that relaxes approval requirements as track record accumulates. What changes is the agent pool; the skill stays declarative.

### 2. Decentralized collaboration

Parties collaborate on workflows by sharing a signed, append-only fact log. No party commands another. Agents advertise capabilities by appending `AgentOffered` facts and take on work by appending `DispatchClaimed` facts. Every coordination action is a fact in the log; every node reaches the same state by projecting that log through a deterministic reducer.

Everything else in the framework is secondary to, and in service of, these two.

---

## Skills are the base primitive

Everything in the DSL orbits the skill. **A skill is a declarative description of a unit of work to be done** — no more, no less. It names the work, describes it, and optionally declares who can approve its dispatch and what capabilities are required to fulfill it. It does not know who will do the work, when, or how.

Because skills are declarative and executor-agnostic:

- The same skill can be fulfilled by a human, an AI agent, or a deterministic script. The skill definition never changes; only the agent registered to fulfill it.
- Skills travel. A skill defined in your log can be copied into another party's log and their agents can fulfill it. Skills are the portable artifact.
- The rest of the DSL (roles, toolboxes, agents, engines, workflows, control flow) exists only to describe the relationships around skills: who can do them, who approves, what tools are authorized, what chain of skills makes a workflow.

If everything else in the DSL disappeared, you could still have a system of skills as plain markdown files that humans do manually. The rest of the framework is the machinery that lets the same skill scale from "human reads a doc and does it" to "AI handles it unattended" without the skill definition changing.

## Strict superset of the Agent Skills standard

Automate Friday's skill format is a **strict superset** of the [Agent Skills open standard](https://agentskills.io) — the SKILL.md format adopted by Claude Code, Cursor, Copilot, Gemini CLI, Aider, and 30+ other tools. The relationship is analogous to TypeScript / JavaScript: every valid SKILL.md is a valid Automate Friday skill, and Automate Friday skills add optional metadata that the base standard doesn't have, namespaced so tools that don't understand the extras safely ignore them.

### What the base standard defines

| Element | Purpose |
|---|---|
| `SKILL.md` | The skill artifact (required) |
| `name`, `description` (frontmatter) | Required fields per spec |
| `scripts/` | Executable code the agent can run |
| `references/` | Docs loaded on demand |
| `assets/` | Static resources, schemas, data files |

### What Automate Friday adds, namespaced

All Automate Friday-specific fields live inside an `automate-friday:` block in YAML frontmatter. Readers that don't know about it treat it as an unknown key and skip it — same way an HTML parser skips unknown attributes.

```yaml
---
name: post-to-discord
description: Post a message to a Discord channel.

automate-friday:
  requires_approval: owner         # gate: only dispatches approved by an owner can proceed
  requires_toolbox: content-tools  # gate: only agents holding content-tools can fulfill
  provides:                        # what this skill produces (for workflow composition)
    - messageId: string
    - postedAt: iso8601
  depends_on:                      # other skills this one composes with
    - validate-channel
---
```

### Why namespacing matters

The earlier design draft proposed a separate `skill.ts` file alongside `SKILL.md`. A spec-maintainer review cut that approach apart: two files = two formats = two-tier ecosystem = fractures the standard. The namespaced frontmatter extension avoids that entirely:

- One file, one format, always.
- Vanilla readers (Claude Code, Cursor, etc.) see a valid SKILL.md — name, description, process — and run it.
- Automate Friday readers see the `automate-friday` block additionally and wire in approval gates, toolbox checks, workflow composition.
- No "this tool supports Automate Friday skills, this one doesn't." Every tool gets a working skill; some get more.

### How a "full skill" plugs into the system

A skill folder in an Automate Friday project looks identical to a standard Agent Skills folder — because it is one:

```
skills/
  post-to-discord/
    SKILL.md          ← the skill (with optional automate-friday block)
    scripts/
      post.ts         ← optional executable
    references/
      discord-api.md  ← optional docs
```

The framework watches the `skills/` directory, reads each `SKILL.md`, and registers it by appending a `SkillRegistered` fact to the log. Any `automate-friday` block fields flow through into the fact. Agents and engines subscribe and react. The skill is live.

The same SKILL.md, copied into another party's repo, is a valid skill there too. If both parties run Automate Friday, the namespaced fields transfer. If one party uses a vanilla Agent Skills tool, they still get a working skill — minus the gates. That's the superset property in practice: graceful degradation, never fracture.

---

## The current DSL

These are the primitives the DSL exposes today. Each compiles to fact-log operations and serves one or both core values. The DSL will grow — new primitives land when a real workflow needs them, not speculatively.

### The base primitive

```typescript
auto.skill(id, {
  description,
  requires_approval?: role,        // progressive automation gate
  requires_toolbox?: toolboxId,    // governance capability gate
})
```

A skill just names and describes work. Nothing else is required. Everything below is an orbital concept that describes how skills get done.

### Things that orbit skills

```typescript
auto.agent(id, {
  kind: 'human' | 'ai' | 'script',  // selection prefers script > ai > human
  fulfills: skillId[],              // which skills I can do
  toolbox?: toolboxId,              // what I'm authorized for
  run: (payload) => Promise<any>,   // fulfillment function
})

auto.role(subject, role)            // attest authority that gates skill approval

auto.toolbox(id, {
  tools: string[],                  // named capability set skills can require
})

auto.engine(id, {
  watches: factKind,                // reactive policy that dispatches skills
  run: (fact) => void | Promise<void>,
})

auto.workflow(id, {
  on: sensorId,                     // trigger
  steps,                            // composition of skills
})
```

### Control flow between steps

```typescript
auto.sequential(...steps)                   // chain steps; later sees earlier
auto.parallel(...steps)                     // fan out; all run concurrently
auto.for(collection, body)                  // iterate; one dispatch per item
auto.switch(value, { case1: body1, ... })   // conditional branch
```

### Why these particular primitives

| Primitive | Serves progressive automation | Serves decentralized collaboration |
|---|---|---|
| `auto.skill` | Declarative unit; same id across fulfillers | Shared contract across parties |
| `auto.role` | Defines WHO can approve | Cross-party trust via attestations |
| `auto.toolbox` | Scopes what a fulfiller can touch | Capability-based authorization across parties |
| `auto.agent` | The graduating entity | Self-advertised capability in the log |
| `auto.engine` | Reactive policies (including trust-graduation rules) | Runs on any node; reacts via log subscription |
| `auto.workflow` | Declarative composition | Shared workflow definition anyone can project |
| `auto.sequential` / `parallel` / `for` / `switch` | Control flow between steps | Deterministic composition across fulfillers |

## What stays out (for now)

Dropped from earlier iterations, or deferred until a real workflow demands them:

- `auto.checkpoint`, `auto.transaction` — persistence concerns belong in the runtime, not the DSL
- `auto.module` — filesystem resolution; the DSL should be declarative, not filesystem-coupled
- 12 relationship words from the earlier `auto.system` DSL (`watches`, `gates`, `escalates`, `supervises`, `overrides`, `spawns`, `owns`, `monitors`, `publishes`, `depends_on`, `signals`, `context`) — most of these collapse into reducer rules in the fact log
- Chassis supervision tree (Erlang/OTP-style) — overkill for reactive loops; replaced by a single log subscription
- Four-primitive vision (Skills / Agents / Tools / Tasks) — Tools are subsumed by Toolboxes; Tasks are subsumed by sensors + DispatchProposed facts

These can come back if we hit a workflow that genuinely needs them. The DSL is an iterative artifact, not a frozen spec.

## Governance toolboxes — a new concept

A **toolbox** is a named bundle of tools or skills a party is authorized to use. Think of it as capability-based security expressed through grouping.

```typescript
auto.toolbox('content-tools', { tools: ['fetch-transcript', 'call-llm', 'post-webhook'] })

auto.skill('post-to-discord', { requires_toolbox: 'content-tools' })

auto.agent('discord-poster', { toolbox: 'content-tools', /* ... */ })
```

The reducer rejects claims from agents whose toolbox doesn't satisfy the skill's requirement. This is distinct from RBAC roles (which gate approval) — toolboxes gate fulfillment. Both layer naturally over the fact log.

## How the DSL compiles to the protocol

Every DSL surface reduces to facts in the log:

| DSL | Fact(s) appended |
|---|---|
| `auto.skill(id, spec)` | `SkillRegistered` |
| `auto.role(subject, role)` | `RoleAttested` |
| `auto.toolbox(id, spec)` | `ToolboxRegistered` |
| `auto.agent(id, spec)` | `AgentOffered` |
| `auto.engine(id, spec)` | Local policy subscribing to log |
| `auto.workflow(id, spec)` | Compiled into an orchestrator engine |
| `dispatch(skill, payload)` | `DispatchProposed` (waits for `DispatchApproved` if required, then `DispatchClaimed` by an agent, then `DispatchConfirmed`) |

The DSL is porcelain. The fact log is plumbing. See the `automate-friday/protocol` companion repo for the underlying substrate.

## Example

See `examples/youtube-to-discord.ts` for a runnable 200-LOC example exercising the core primitives with live Haiku-backed agents via `claude -p`. It demonstrates:

- A skill with a toolbox gate (`summarize-video` requires `content-tools`)
- A skill with an approval gate (`post-to-discord` requires `owner` role)
- Multi-kind agents (an AI summarizer and a script Discord-poster)
- An RBAC approver engine that projects attestations and records approvals
- A workflow orchestrator engine that chains dispatches based on `DispatchConfirmed` facts
- Live fact-log output showing the entire collaboration

Run it with `bun examples/youtube-to-discord.ts`. No API key required — Haiku is invoked through the local Claude Code CLI.
