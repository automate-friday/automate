# Automate Friday

> **Automate your business so you can take Friday off.**
> A framework for real AI automation — where the same skill can be done by a human today, an AI tomorrow, and a script next month, with approval workflows and audit built in.

---

## The problem

AI agents can do real work. You just can't trust them to always do it right.

So automation today is a cliff — either a human does it, or an AI does it, or a script does it. Moving between those states means rebuilding the integration from scratch. You can't ease into AI. You can't let Claude handle customer replies "with approval for anything over $100." You can't start with a human doing 100% of a task and incrementally hand it off.

You end up with two bad options: don't use AI, or hand it the keys.

## The idea

**Skills are the base primitive.** A skill is a declarative description of work that needs to happen — written in plain language with structured metadata, no code required. A skill does not know who will do it, when, or how. It just names the work and describes it.

A skill in Automate Friday is a **`SKILL.md` file** — the same format used by the [Agent Skills open standard](https://agentskills.io) adopted by Claude Code, Cursor, Copilot, Gemini CLI, Aider, and 30+ other tools. Automate Friday is a **strict superset** of that standard. Any valid SKILL.md works here as-is; Automate Friday adds optional namespaced fields that unlock approval gates and composition. Tools that don't know Automate Friday safely ignore those fields — the skill still runs.

Everything else in the framework exists in service of skills: agents provide them, roles gate their approval, engines dispatch them, workflows compose them, control flow orders them.

Because skills are declarative and executor-agnostic, the same skill can be done by different fulfillers as trust grows:

```
Skill: "reply to customer support ticket"

  Today:    a human on your team does it
  Month 2:  Claude drafts, human approves, sends
  Month 6:  Claude handles tickets under $50, routes the rest to humans
  Year 1:   a script handles deterministic cases; Claude handles the rest; humans handle appeals
```

The skill definition never changes. What changes is who provides it — and that shifts silently as track record accumulates.

This is **progressive automation**. It is the product.

## What you get

1. **A declarative DSL for workflows.** Describe what work exists (skills), who can do it (agents), who approves (roles). Compose skills into workflows with control flow between steps.

2. **Trust that graduates.** The approval gate on a skill is a simple rule. Once an agent has proven itself — say, 100 successful ticket replies, zero escalations — that rule relaxes automatically. No rebuild. The audit log proves why.

3. **Agents as first-class peers.** Humans, AI agents (Claude, local models), and deterministic scripts all participate through the same interface. Swap one for another without touching the workflow.

4. **Collaboration across machines and organizations.** Your agent on your laptop and your client's agent on their VPS can work on the same task. They coordinate through a shared log — no integration project, no bespoke API.

5. **Audit for free.** Every action is a signed entry in the log. "Why did this refund go out at 3pm?" is answerable by dumping the log. Compliance, debugging, and replay are all projections over the same data.

## Who this is for

- **Indie founders** who want AI to take over more of their operations as confidence grows, without betting the business on day one.
- **Teams** that need multi-party approval workflows (procurement, customer refunds, deploys) and don't want to rebuild when they add AI.
- **Agencies and consultants** whose clients want to collaborate with their AI systems on shared workflows — without handing over credentials or building one-off integrations.
- **Builders** who see the future as human + AI + scripts collaborating on real business, not yet another chatbot.

## What a skill looks like

A vanilla SKILL.md — works in every Agent Skills-compatible tool:

```markdown
---
name: post-to-discord
description: Post a message to a specified Discord channel.
---

# Post to Discord

Given a channel name and a message body, post it to Discord.

## Inputs
- `channel` — the channel to post to (e.g. `#releases`)
- `content` — the message body (markdown supported)

## Process
1. Validate the channel exists and you have permission
2. POST to the Discord webhook
3. Return the posted message id

## Output
- `messageId` — the Discord message id
- `postedAt` — ISO timestamp
```

Same skill with Automate Friday extensions — still a valid SKILL.md; other tools ignore the `automate-friday` block:

```markdown
---
name: post-to-discord
description: Post a message to a specified Discord channel.

automate-friday:
  requires_approval: owner        # human-in-the-loop until trust graduates
  requires: [validate-channel]    # sub-capabilities this skill composes
---

# Post to Discord
...
```

That's it. One block of namespaced fields. A human reading the skill still understands it. Claude Code or Cursor still reads it. Automate Friday additionally wires in the approval gate and composition.

## What a workflow looks like

```typescript
// A real YouTube → Discord workflow, ~200 LOC end-to-end

auto.skill('summarize-video',  { description: 'Summarize a YouTube video' })
auto.skill('post-to-discord',  { description: 'Post a message to Discord', requires_approval: 'owner' })

auto.agent('claude-summarizer', { kind: 'ai',     provides: ['summarize-video'], /* Haiku */ })
auto.agent('discord-poster',    { kind: 'script', provides: ['post-to-discord'], /* webhook */ })

auto.workflow('youtube-to-discord', {
  on: 'youtube',
  steps: auto.sequential(
    { skill: 'summarize-video' },
    { skill: 'post-to-discord' },
  ),
})
```

Run that with `bun examples/youtube-to-discord.ts`. You'll see live fact-log output as the AI agent summarizes and the script agent posts — with the `post-to-discord` step pausing for approval until the owner greenlights it. Remove the approval requirement, and it runs autonomously. Add a new agent kind, it joins immediately.

No servers to configure. No webhook plumbing. No bespoke integration code.

## The DSL

Automate Friday's DSL stays as small as it can while covering real workflows. The base primitive is the skill — everything else exists to describe how skills get done.

```
The base primitive:
  auto.skill       — declare a unit of work; can list `requires: [...]` for composition

Things that orbit skills:
  auto.agent       — capability provider: `provides: [...]` which skills it can do
  auto.role        — attest authority that gates approval of skill dispatches
  auto.engine      — react to the world and dispatch skills
  auto.workflow    — compose skills into a pipeline, triggered by a sensor

Control flow between skill dispatches:
  auto.sequential  — chain in order; later steps see earlier outputs
  auto.parallel    — fan out; all steps run concurrently
  auto.for         — iterate over a collection; one dispatch per item
  auto.switch      — conditional branch based on projected state
```

The vocabulary mirrors POSIX package semantics: skills declare what they `require`, agents declare what they `provide`, and the runtime matches provider to requirement. How an agent concretely does the work (a webhook, an MCP server, a human clicking a button) is the agent's internal business — not modeled by the DSL.

Queues, retries, approvals, audit, replay, multi-party coordination, and progressive automation all fall out of how these primitives compose over a shared fact log — they aren't separate subsystems. See [`docs/key-ideas.md`](docs/key-ideas.md) for how each primitive earns its place.

The DSL is actively evolving. New primitives land when a real workflow we care about needs them; we don't add surface speculatively. Governance over shared resources like MCP servers and secrets — what was previously called "toolbox" — is explicitly **not** part of the core framework; see [`docs/ROADMAP.md`](docs/ROADMAP.md) for the plugin model that will live alongside the core.

## Status

- **Working today:** the seven-primitive DSL, the reactive runtime, and the YouTube → Discord example with live Haiku agents.
- **In progress:** more examples (Etsy store, incident response, BDB workflows), persistent log transports (Convex, Postgres, Git-as-log), additional agent kinds.
- **Open source:** yes. See the [protocol repo](https://github.com/automate-friday/protocol) for the underlying substrate.

## Get started

```bash
git clone https://github.com/automate-friday/automate
cd automate
bun examples/youtube-to-discord.ts
```

You'll need [Bun](https://bun.sh) and the Claude Code CLI installed. No API keys required — Haiku is invoked through the local `claude` command.

## Related

- **[automate-friday/protocol](https://github.com/automate-friday/protocol)** — the open protocol spec and minimal reference prototypes. MIT-licensed. Read this if you want to implement a new runtime or transport.
- **[Why this matters](https://github.com/automate-friday/protocol/blob/main/WHITE-PAPER.md#why-this-matters)** — the longer argument for progressive automation and decentralized collaboration.

## License

Free for personal, internal, and non-competing commercial use. Converts fully to Apache 2.0 in April 2028. See [LICENSE](LICENSE) for specifics.
