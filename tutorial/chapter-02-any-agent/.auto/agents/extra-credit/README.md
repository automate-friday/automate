# Extra credit — every runtime is a first-class agent

The `heartbeat` skill can be fulfilled from any environment that can produce a
JSON fact and get it appended to the log. The entries in this folder are
registrations for 20+ different runtimes showing that the agent primitive is
genuinely universal — humans over SSH, LLMs on VPS, Discord bots, Convex
functions, Cloudflare workers, React apps, terraform templates, and exotic
protocols are all first-class actors.

## The generic pattern

Every agent reduces to three choices:

1. **Read** the skill (SKILL.md is delivered — preloaded, pulled from git,
   sent as a prompt, or hand-copied).
2. **Compose** a fact (produce JSON matching the skill's declared shape).
3. **Publish** the fact — get it committed to the log.

Step 3 is where runtimes differ.

### Pattern A — direct git push

The agent runs somewhere with `git` and push credentials. Pull → append →
commit → push. Use the existing `.auto/adapters/git-run` script.

Fits: local CLIs, VPS processes, humans over SSH, containerized runtimes.

### Pattern B — webhook bridge

The agent has no local git. It produces the fact in its own environment and
POSTs it to a commit proxy — a GitHub Action triggered by `repository_dispatch`,
or a small HTTP service that commits via the GitHub API. The bridge is the
only component that needs write access to the repo; every new "B" runtime is
just another caller of the same endpoint.

Fits: bots, browser apps, serverless functions, protocol-level clients.

### Pattern C — declarative (IaC / meta)

Doesn't fulfil a skill itself. Provisions *other agents* (cron jobs on VPS,
Cloudflare workers, Convex deployments). The log receives Ran facts from the
provisioned agents once they're running.

Fits: terraform, pulumi, ansible.

## Catalog

| Agent | Pattern | Effort to make real | Notes |
|---|---|---|---|
| [codex-local](./codex-local.md) | A | trivial | `codex -p` CLI |
| [cursor-agent-local](./cursor-agent-local.md) | A | trivial | `cursor-agent -p` CLI |
| [human-ssh](./human-ssh.md) | A | trivial | person + shell + git |
| [llm-vps](./llm-vps.md) | A | trivial | any LLM runtime on a VPS |
| [openclaw-gateway](./openclaw-gateway.md) | A | stub | OpenClaw container |
| [hermes-gateway](./hermes-gateway.md) | A | runnable | already exists in infra |
| [discord-bot](./discord-bot.md) | B | moderate | slash command → bridge |
| [slack-bot](./slack-bot.md) | B | moderate | slash command → bridge |
| [telegram-bot](./telegram-bot.md) | B | moderate | bot API → bridge |
| [convex-function](./convex-function.md) | B | moderate | HTTP action → GitHub API |
| [webhook-generic](./webhook-generic.md) | B | trivial | any POST → bridge |
| [n8n-workflow](./n8n-workflow.md) | B | moderate | workflow platform |
| [temporal-workflow](./temporal-workflow.md) | B | moderate | durable workflow |
| [vercel-edge](./vercel-edge.md) | B | moderate | Vercel edge function |
| [cloudflare-worker](./cloudflare-worker.md) | B | moderate | Cloudflare Worker |
| [react-app](./react-app.md) | B | moderate | browser + user's GitHub OAuth |
| [astro-post-handler](./astro-post-handler.md) | B | moderate | Astro server endpoint |
| [xml-form-submitter](./xml-form-submitter.md) | B | trivial | HTML form action |
| [http-client](./http-client.md) | B | trivial | `curl` / generic HTTP |
| [websocket](./websocket.md) | B | moderate | ws:// → bridge |
| [wss](./wss.md) | B | moderate | wss:// → bridge |
| [terraform-template](./terraform-template.md) | C | moderate | provisions other agents |

## The one bridge unlocks 15+ runtimes

Pattern B runtimes all share the same bridge. Build it once — a ~30-line
GitHub Action listening on `repository_dispatch`, or a ~50-line Cloudflare
Worker that commits via the GitHub API — and every bridged runtime becomes a
frontmatter entry plus a one-line POST.

This is why the "how hard to make them all real" answer is *not* 20× the
work of one. It's roughly 1× (build the bridge) + 20 × (small invocation
snippets). The hard part is the commit proxy; the runtimes themselves are
almost rounding error.

## How to activate a runtime

1. Copy the chosen runtime's `.md` file up to `../` (into `.auto/agents/`).
2. Change `status: concept|stub` → `status: runnable`.
3. Wire the runtime per its "Invocation" section — add the bridge call or
   install the cron or deploy the function.
4. Run it. The fact lands in `.auto/skills/heartbeat/log.jsonl` tagged with
   your agent id.

The skill file never changes. The log doesn't care. Only the agent
registration and the runtime wiring are new per adoption.
