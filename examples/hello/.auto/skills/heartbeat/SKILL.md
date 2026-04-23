---
name: heartbeat
description: Append a Ran fact to the fact log every time this skill is invoked.
---

# Heartbeat

Every time I run, I append one fact to the fact log saying I ran.

The fact has:
- `by`: `"heartbeat"`
- `kind`: `"Ran"`
- `payload.runner`: the hostname that ran it
- `payload.at_iso`: the ISO timestamp of the run (same value as the top-level `at`)

That's the entire skill. One run, one fact.
