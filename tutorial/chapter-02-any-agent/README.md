# Chapter 2 — any agent can fulfil the skill

**Same skill as Chapter 1. Same log. Different kinds of agents.**

## The delta from Chapter 1

Nothing in the skill changes. What changes is:
- **More agent registrations** in `.auto/agents/` — `bun-local` (deterministic
  script), `claude-code-local` (an LLM), `human-terminal` (a human typing).
- **The log has more lines**, each tagged with whoever showed up.

## Read the log

```
{ Genesis              by: jacob           }
{ Ran                  by: bun-local       }     ← deterministic script (bun run.ts)
{ Ran                  by: codex-local     }     ← a real LLM (codex exec)
{ Ran                  by: human-terminal  }     ← someone typed it by hand
```

All three Ran facts have identical shape. They agree on the skill's contract
(format declared in SKILL.md). They differ only in `by` and `at`. The skill
doesn't prefer any one of them; the log records all three equally.

## The key moment — your agent writes to your local copy

This chapter isn't real until **you** run the skill with **your own agent**
and see it land in your local copy of `log.jsonl`. Until that happens, this
is words on a page. Pick the invocation below that matches an agent you
already have installed; expect one new line to appear at the bottom of
`.auto/skills/heartbeat/log.jsonl`.

```sh
# You have bun installed? This is chapter 1's path — deterministic, fast.
cd tutorial/chapter-02-any-agent
AGENT=bun-<your-name> bun run.ts

# You have the claude CLI? Let a real LLM reason about the skill and append.
cd tutorial/chapter-02-any-agent
claude -p "$(cat .auto/skills/heartbeat/SKILL.md)

Run this skill now. Append the Ran fact to .auto/skills/heartbeat/log.jsonl.
Use by=claude-<your-name>."

# You have codex installed? Same, with codex.
cd tutorial/chapter-02-any-agent
codex exec --full-auto "$(cat .auto/skills/heartbeat/SKILL.md)

Run this skill. Append to .auto/skills/heartbeat/log.jsonl using by=codex-<your-name>."

# No installed LLM? Be the agent yourself.
cd tutorial/chapter-02-any-agent
AT=$(bun -e 'console.log(new Date().toISOString())')
RUNNER=$(hostname)
BY="human-<your-name>"
ID=$(printf '%s' "$AT$RUNNER$BY" | openssl dgst -sha256 -hex | awk '{print $2}' | cut -c1-12)
printf '{"id":"%s","at":"%s","by":"%s","kind":"Ran","payload":{"runner":"%s"}}\n' \
  "$ID" "$AT" "$BY" "$RUNNER" >> .auto/skills/heartbeat/log.jsonl
```

When you're done, `tail -1 .auto/skills/heartbeat/log.jsonl` should show
*your* fact. You (your agent) just wrote to the log. That's the moment the
skill is real — not because Jacob seeded three Ran facts, but because *your*
runtime fulfilled the same contract using the same file and came out the
other side with a matching JSONL line.

**That append is local.** You haven't committed it, haven't pushed it. It
lives only in your working copy. To get it into the shared log, someone
needs to merge it — that's chapter 3.

## What this validates

- Skills are declarative. Every runtime that can read natural language can
  fulfil them.
- Agents are runtimes. Humans, LLMs, scripts — all the same kind of thing
  from the skill's point of view.
- The log is the shared record. It doesn't care who wrote; it just accepts.
- *You* proved this by running the skill yourself.

## Extra credit — every runtime is a first-class agent

See [`.auto/agents/extra-credit/`](./.auto/agents/extra-credit/README.md).

The chapter's three core agents prove the point with script / LLM / human.
The extra-credit folder shows how far it goes: 22 agent registrations
covering local CLIs (codex, cursor-agent), humans over SSH, VPS LLMs,
OpenClaw and Hermes gateways, Discord / Slack / Telegram bots, Convex /
Vercel / Cloudflare / Temporal / n8n functions, React apps, Astro server
endpoints, raw HTTP / WebSocket / WSS clients, XML forms, and Terraform
templates that provision fleets of agents.

The cost of supporting them isn't `22×` — it's **`1× (one commit bridge) +
22× (small invocation snippets)`**. Pattern A runtimes push directly via the
existing `git-run` adapter. Pattern B runtimes all call one shared bridge
endpoint. Pattern C (IaC) provisions the others declaratively.

Each extra-credit file is a valid `.auto/agents/*.md` registration. To
activate one, copy it up one level into `.auto/agents/` and wire its
invocation per the file's "Invocation" section.

## What's next

- **Chapter 3** — governance. Now that many agents can write, we need a way
  to say which ones are allowed to commit unilaterally and which need
  approval. The fact log itself is where that happens, via PR-based merge.
