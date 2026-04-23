---
name: human-terminal
kind: human
capabilities: [skill-execution]
executes:
  - heartbeat
---

# Agent: human-terminal

A human at a shell, doing what SKILL.md says by hand.

## Invoke

```
AT=$(bun -e 'console.log(new Date().toISOString())')
RUNNER=$(hostname)
BY="human-terminal"
ID=$(printf '%s' "${AT}${RUNNER}${BY}" | openssl dgst -sha256 -hex | awk '{print $2}' | cut -c1-12)
printf '{"id":"%s","at":"%s","by":"%s","kind":"Ran","payload":{"runner":"%s"}}\n' \
  "$ID" "$AT" "$BY" "$RUNNER" >> .auto/skills/heartbeat/log.jsonl
```

No framework, no script. A human opens an editor, reads the skill, types
the JSONL into the file. All three approaches produce indistinguishable facts
in the log.
