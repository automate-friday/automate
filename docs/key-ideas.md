# Key Ideas — Automate Friday Framework

The framework exists to deliver two values. Everything in the DSL, runtime, and documentation either serves one of these or gets cut.

## The two core values

### 1. Declarative progressive automation

The same skill should be fulfillable today by a human, tomorrow by an AI agent, next month by a deterministic script — **without the skill definition changing**. Trust graduation is a reducer rule that relaxes approval requirements as track record accumulates. What changes is the agent pool; the skill stays declarative.

### 2. Decentralized collaboration

Parties collaborate on workflows by sharing a signed, append-only fact log. No party commands another. Agents advertise capabilities by appending `AgentOffered` facts and take on work by appending `DispatchClaimed` facts. Every coordination action is a fact in the log; every node reaches the same state by projecting that log through a deterministic reducer.

Everything else in the framework is secondary to, and in service of, these two.

---

## The current DSL

These are the primitives the DSL exposes today. Each compiles to fact-log operations and serves one or both core values. The DSL will grow — new primitives land when a real workflow needs them, not speculatively.

### Declarations

```typescript
auto.skill(id, {
  description,
  requires_approval?: role,        // progressive automation gate
  requires_toolbox?: toolboxId,    // governance capability gate
})

auto.role(subject, role)            // attest a role

auto.toolbox(id, {
  tools: string[],                  // named capability bundle
})

auto.agent(id, {
  kind: 'human' | 'ai' | 'script',  // selection prefers script > ai > human
  fulfills: skillId[],
  toolbox?: toolboxId,              // what this agent is authorized for
  run: (payload) => Promise<any>,   // fulfillment function
})

auto.engine(id, {
  watches: factKind,                // reactive policy
  run: (fact) => void | Promise<void>,
})

auto.workflow(id, {
  on: sensorId,                     // trigger
  steps,                            // composition (see control flow below)
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
