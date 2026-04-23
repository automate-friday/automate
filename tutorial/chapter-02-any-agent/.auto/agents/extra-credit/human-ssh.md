---
name: human-ssh
kind: human
pattern: A
status: concept
executes:
  - heartbeat
---

# Agent: human-ssh

A human SSH'd into a box that has the repo cloned and git push credentials.
Reads SKILL.md in an editor, types the fact out, commits, pushes.

## Read → compose → publish

- **Read**: `cat .auto/skills/heartbeat/SKILL.md` in the remote shell.
- **Compose**: human constructs the JSON by hand (or pastes a template).
- **Publish**: regular `git add && git commit && git push`.

## Invocation

```sh
# On the remote host:
ssh vps
cd /path/to/repo
git pull --rebase
vim .auto/skills/heartbeat/log.jsonl   # append one JSONL line with by=human-ssh
git add .auto/skills/heartbeat/log.jsonl
git commit -m "skill-run: human-ssh"
git push
```

## Effort

Trivial. No new code. The human is the runtime.
