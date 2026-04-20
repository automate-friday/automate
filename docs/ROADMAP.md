# Roadmap

Status of things that are in the core framework, next up, or deferred to plugin territory.

## Core framework — shipping and evolving

The DSL primitives and runtime described in [`key-ideas.md`](key-ideas.md): skills, agents, roles, engines, workflows, control flow (`sequential`, `parallel`, `for`, `switch`). The underlying protocol is in the [companion protocol repo](https://github.com/automate-friday/protocol). See the README for current state.

## Near-term core work

- **Persistent log transports** — adapters for Convex, Postgres, Git-as-log, Redis Streams. Swap the in-memory FactLog out without touching agent or skill code.
- **Cryptographic signatures on facts** — replace the signer-string stub with real keypair signing.
- **Trust graduation reducer rules** — first-class helpers for the "if agent X has N confirmed dispatches, waive approval" pattern.
- **More canonical examples** — Etsy store management, incident response with on-call, business development (lead → proposal) workflows.
- **A reference human-agent interface** — how humans actually see and approve dispatches (CLI, web, mobile notifications).

## Explicitly not core — plugin / extension territory

These are useful, probably important for real deployments, and *not part of the core framework*. They plug in via fact schemas and middleware rather than being baked into the DSL.

### Toolbox — governed access to MCP servers and secrets

**What it is.** When agents need to call MCP tools, hit third-party APIs, or access shared secrets (a Discord webhook URL, a Stripe key, a database connection), someone has to decide who gets which access. "Toolbox" is the working name for a governance layer that:

- Defines named bundles of MCP servers / API endpoints / secrets an agent is authorized to touch
- Enforces RBAC at the tool-call boundary (who can use `mcp__stripe__refund`?)
- Logs every tool invocation as a fact in the log so the whole thing is auditable
- Potentially runs as its own agent/engine: a "toolbox-guardian" that sits between the requesting agent and the actual tool call

**Why it's not core.** The core framework is about **skill and agent distributed composability with governance by role/approval**. Toolbox is **tool-layer authorization over shared secrets and external services** — a genuinely different concern with its own design space (credential rotation, attenuation, auditing, scoped delegation). Packing it into the core would conflate two separate governance layers. Keeping it as a plugin lets it evolve on its own timeline and lets users who don't need it avoid the complexity.

**How it plugs in.** As additional fact kinds in the log (`ToolboxGranted`, `ToolInvoked`, `SecretAccessed`) plus middleware that projects those facts to enforce the RBAC rules. Agents that want scoped tool access bind to a toolbox; agents that don't, don't. Skills never mention it.

**Status.** Not yet designed in detail. If you want this, the shape will clarify once the core is stable.

### Skill marketplace

A registry where skills (and optionally agent implementations) can be discovered, attested, rated, and versioned. Emerges naturally as fact kinds in a shared log but needs discovery-tooling, social-graph attestation, and reputation projections. Orthogonal to core.

### Economic / payment primitives

`OfferPricedFor`, `DispatchPaid`, `CollateralSlashed`. Useful for agent marketplaces. Not core; settles via external systems.

### Visual editors and non-developer UI

A drag-drop builder, dashboards for projection views, non-developer workflow composition. Product-layer concerns; the core is the protocol and the DSL it compiles to.

## Why the core stays narrow

Every primitive in the core has to earn its place against two values: **declarative progressive automation** and **decentralized collaboration**. Things that serve a different concern — even important ones — belong alongside the core, not inside it. This is how the core stays small enough to hold in your head and the framework stays composable at its edges.
