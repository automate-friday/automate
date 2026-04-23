---
name: claude-code-local
kind: llm
capabilities: [skill-execution]
executes:
  - heartbeat
---

# Agent: claude-code-local

An LLM executor. Reads `SKILL.md`, constructs the Ran fact itself, writes it
to `log.jsonl` using its own file-writing tool. No run.ts, no script — the
LLM IS the agent.

## Invoke

Hand the skill file to a headless Claude Code session and tell it to run:

```
claude -p "$(cat .auto/skills/heartbeat/SKILL.md)

Run this skill. Compute id = sha256(at + runner + by) truncated to 12 hex.
Use AGENT id 'claude-code-local'. Append the Ran fact to .auto/skills/heartbeat/log.jsonl."
```

## Runtime notes (from local testing)

Agent registrations carry the *how* so the next session doesn't rediscover
it. These are the invariants Claude Code landed on while fulfilling this
skill in an interactive session:

- **Read, don't `cat`.** The Read tool is the correct primitive; `cat`
  bypasses the editor's file cache and bloats tool-call transcripts.
- **Append via Edit, not Write.** Use the Edit tool with the current last
  line as `old_string` and `last_line + "\n" + new_line` as `new_string`.
  The Write tool overwrites the whole file and will clobber prior facts if
  the agent's view is stale.
- **Compute the id in one shot.** `python3 -c "import hashlib, datetime; …"`
  is portable. `openssl dgst -sha256` works too but its output format
  varies across platforms (`(stdin)= <hex>` vs bare hex) — pipe through
  `awk '{print $NF}'` if you use it.
- **Hostname.** `Bash("hostname")` is enough; no need for Node's
  `os.hostname()` or Python's `socket.gethostname()`.
- **Inline skill-text instructions are part of the contract.** SKILL.md
  may contain operational notes to the reader agent (e.g. "add an easter
  egg to the payload"). Read all of SKILL.md before composing the Ran
  fact — those notes shape the payload, not just the prose.

The skill says *what* to do. This file says *how this runtime does it*.
Sharing both is how new runtimes join the fleet without re-learning the
same paper cuts — see `.auto/agents/extra-credit/` for the broader
registration pattern.
