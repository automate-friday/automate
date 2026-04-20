# Automate Friday

> **Skills are things to do. Agents are who can do them. The log is the proof.**
>
> A deterministic orchestrator for trustworthy multi-agent automation.

---

## The problem

AI agents can do real work. You just can't trust them to always do it right.

So automation today is a cliff — either a human does it, or an AI does it, or a script does it. Moving between those states means rebuilding the integration from scratch. You can't ease into AI. You can't let Claude handle customer replies "with approval for anything over $100." You can't start with a human doing 100% of a task and incrementally hand it off.

You end up with two bad options: don't use AI, or hand it the keys.

## The idea

**Skills are markdown files that describe work to be done.** A SKILL.md file is a declarative description — a human could follow it, an AI can execute it, or a deterministic script can implement it. The definition doesn't change; only who fulfills it does.

**Agents are entities that provide skills.** Humans, AI agents, and scripts all advertise which skills they can do. When work is requested, the framework figures out who's eligible and dispatches accordingly.

**The log is the shared proof substrate.** Every request, approval, claim, and completion is an append-only fact. The log can be a Git repo, a Convex table, an S3 bucket, or any other append-only store — the framework doesn't own the substrate. What it adds is **governance rules** over that substrate: who's allowed to approve, who's allowed to claim, what gates fire when.

**Even if you work alone, skills help.** Writing your work as markdown skills organizes your own labor, lets you compose work into larger workflows, and gives an audit trail of what you've done. Agents are what happens when you decide to share, delegate, or scale — but the skill value exists from turn one.

Because skills are executor-agnostic, the same skill can be done by different providers as trust grows:

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

1. **A declarative skill format.** Your work as markdown files, compatible with [Agent Skills](https://agentskills.io) — the open standard used by Claude Code, Cursor, Copilot, and 30+ other tools.

2. **A deterministic governance orchestrator.** Declare rules in your skill's frontmatter — `requires_approval: owner`, composition steps, required sub-skills. The framework enforces them, logs every step, and refuses to proceed when rules aren't satisfied.

3. **Trust that graduates.** The approval gate on a skill is a simple rule. Once a provider has proven itself, that rule relaxes automatically. No rebuild. The log proves why.

4. **Agents as first-class peers.** Humans, AI agents, and scripts participate through the same interface. Swap one for another without touching the skill.

5. **Collaboration across machines and organizations.** Point two parties at the same log and their agents work on shared outcomes. No integration project, no bespoke API.

6. **Audit for free.** Every action is a signed entry. "Why did this refund go out at 3pm?" is answerable by reading the log. Compliance, debugging, and replay are projections over the same data.

## Who this is for

- **Indie founders** who want AI to take over more of their operations as confidence grows, without betting the business on day one.
- **Teams** that need multi-party approval workflows and don't want to rebuild when they add AI.
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
1. Validate the channel
2. POST to the Discord webhook
3. Return the posted message id
```

Same skill with Automate Friday extensions — still a valid SKILL.md; other tools ignore the `automate-friday` block:

```markdown
---
name: post-to-discord
description: Post a message to a specified Discord channel.

automate-friday:
  requires_approval: owner        # human-in-the-loop until trust graduates
---
```

## What a composite skill looks like

A workflow is just a skill that declares its sub-skills:

```markdown
---
name: youtube-to-discord
description: When a video is published, summarize and post it to Discord.
trigger: youtube

automate-friday:
  requires_approval: owner
  steps:
    - skill: summarize-video
      as: summary
    - skill: post-to-discord
      with:
        content: "${summary}"
---

# YouTube to Discord

When a new YouTube video is published, summarize it and post the result to Discord.
```

That's the artifact. A human can read it. Claude Code can read it. Automate Friday reads it and dispatches the sub-skills in order, each going through its own approval gates. If the declarative frontmatter isn't enough, drop into a bash block as the escape hatch.

## Two primitives, that's it

```typescript
auto.skill(id, spec)    // compiles to SKILL.md
auto.agent(id, spec)    // registers an entity that provides skills
```

Everything else collapses:

- **Workflow** = composite skill (a SKILL.md with `steps:`)
- **Role** = a skill that only certain agents provide (e.g. `approve-refund`)
- **Tool** = a deterministic skill (bash invocation, API call, SQL query)
- **Engine** = an agent with a subscription (reacts to log facts)
- **Control flow** = frontmatter structure (sequential/parallel blocks) or bash

Helpers like `auto.sequential` / `auto.parallel` / `auto.for` / `auto.switch` are **optional sugar that generates richer frontmatter**. They're not primitives. You can write the markdown by hand and skip the DSL entirely.

The framework is ruthlessly small on purpose. Complexity goes into governance rules (optional), not into the base.

## The governance layer

Skills declare rules in frontmatter. The framework's orchestrator enforces them:

- `requires_approval: owner` — wait for an agent holding the `owner` role to approve.
- `steps:` — dispatch these sub-skills in order.
- `requires: [validate-channel]` — this skill composes on top of others.

**Governance starts simple.** The minimum viable governance is a human reading the log and approving dispatches manually. Over time, you add deterministic rules as reducer middleware — rate limits, reputation-based auto-approval, compliance checks. But the base framework only needs: skills, agents, and a log.

## The log could be Git

The log is an append-only substrate. Any append-only store works:

- A Git repo (each commit is a fact; each skill execution gets its own repo or branch)
- A Convex table
- An S3 bucket with object versioning
- A WebSocket stream backed by any persistent log

The framework doesn't invent the substrate — it adds the **governance rules** that run on top.

## Status

- **Working today:** two-primitive DSL, reactive runtime, YouTube→Discord example with live Haiku agents via `claude -p`.
- **In progress:** persistent log transports (Convex, Git), cryptographic signatures, more canonical examples.
- **Open source:** yes. See the [protocol repo](https://github.com/automate-friday/protocol) for the underlying substrate.
- **Not core, deferred as plugins:** toolbox (governed MCP access), skill marketplace, economic primitives, visual editors. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Get started

```bash
git clone https://github.com/automate-friday/automate
cd automate
bun examples/youtube-to-discord.ts
```

You'll need [Bun](https://bun.sh) and the Claude Code CLI. No API keys required — Haiku is invoked through the local `claude` command.

## Related

- **[automate-friday/protocol](https://github.com/automate-friday/protocol)** — the open protocol spec and minimal reference prototypes. MIT-licensed.
- **[docs/key-ideas.md](docs/key-ideas.md)** — the model explained in depth.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — what's core, what's plugin, what's deferred.

## License

Free for personal, internal, and non-competing commercial use. Converts fully to Apache 2.0 in April 2028. See [LICENSE](LICENSE) for specifics.
