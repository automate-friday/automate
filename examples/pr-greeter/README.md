# pr-greeter — toy demo of the three-primitive superset

A working example of the automate model: **skill + agent + fact log**, wired
through a GitHub Action. The whole thing is ~100 lines of real code; the rest
is declarations.

When someone opens a PR in a repo running this demo:
- if they've never been greeted here before, a first-time welcome is posted;
- if they're a returning contributor, a short welcome-back is posted.

Memory comes from the fact log. There's no database, no runtime kernel, no
reducer. There's a markdown skill, a declared engine lifecycle, an agent that
runs the skill, and a JSONL fact log committed back into `.auto/facts/`.

## Layout

```
examples/pr-greeter/
├── .auto/
│   ├── skills/
│   │   ├── welcome-new-contributor/SKILL.md       # frontmatter + template
│   │   └── welcome-back-contributor/SKILL.md
│   ├── engines/
│   │   └── pr-greeter/lifecycle.yaml              # declared cyclic lifecycle
│   ├── agents/
│   │   ├── deterministic-local.md                 # the demo agent
│   │   └── claude-p.md                            # reference swap target
│   └── facts/                                     # grows with every run
├── .github/workflows/auto.yml                     # the git adapter
├── scripts/
│   ├── auto-runner.mjs                            # ~60 LOC orchestrator
│   └── agents/
│       ├── deterministic-local.mjs                # ~25 LOC substitution agent
│       └── claude-p.mjs                           # ~20 LOC LLM agent (unused)
├── package.json
└── README.md (this file)
```

## The three primitives

**Skill.** A SKILL.md file under `.auto/skills/<name>/`. Anthropic-compatible
frontmatter at the root (`name`, `description`), plus our extensions under a
`metadata.automate/*` namespace:

```yaml
metadata:
  automate/inputSchema:  { ...JSON Schema... }
  automate/outputSchema: { ...JSON Schema... }
```

Anthropic tools ignore `metadata`; automate-aware tools read it. The superset
never breaks upstream.

**Agent.** Any executor that fulfills the `skill-execution` capability. Declared
as a markdown file under `.auto/agents/<name>.md`. Each agent publishes its
promises (Promise Theory) and the fact-log contract for requesting work.

**Fact log.** JSONL files under `.auto/facts/`, committed to git. Every run
appends. `git log -- .auto/facts/` is your audit trail. Memory lookups are
just reading prior facts.

## The engine is a declaration, not a runtime

`.auto/engines/pr-greeter/lifecycle.yaml`:

```yaml
on:
  kind: PROpened
  steps:
    - when: "no prior Greeted fact for this author"
      skill: welcome-new-contributor
      agent: deterministic-local
    - when: "any prior Greeted fact for this author"
      skill: welcome-back-contributor
      agent: deterministic-local
```

That's the engine. No class, no runtime object. The git adapter reads this
file, picks the matching step, runs the skill via the named agent, records
the resulting fact. The engine is *emergent* — a convention over facts + skills.

## The PyTorch moment: agents are swappable

Same skill. Same engine lifecycle. Same fact log. Change one line:

```yaml
# .auto/engines/pr-greeter/lifecycle.yaml

- skill: welcome-new-contributor
  agent: deterministic-local   # ← zero-dependency substitution

# ...or...

- skill: welcome-new-contributor
  agent: claude-p              # ← LLM rewrites the greeting, same contract
```

Both agents implement `skill-execution`. Both take the skill + inputs over
stdin and return outputs matching `automate/outputSchema` over stdout.
`deterministic-local` does `{var}` substitution; `claude-p` pipes the skill
body to `claude -p`. The calling site doesn't care which one runs. This is
the same move as `torch.jit.script(fn)` vs `fn` — call site unchanged,
backend swapped.

## How to drop this into your own repo

1. Copy `.auto/`, `scripts/`, `package.json`, `.github/workflows/auto.yml` to
   the root of your repo.
2. `npm install` (or let the Action do it).
3. Open a PR. The greeter runs.
4. Edit `.auto/skills/*/SKILL.md` to change the messages. Edit
   `.auto/engines/pr-greeter/lifecycle.yaml` to add steps. Add your own skills
   under `.auto/skills/` and reference them from new engines.

## What this demo deliberately does NOT prove

Each item below is one line or less to add once you want it — but keeping them
out of this toy is the point.

- **Multi-agent collaboration.** Would add a second agent and a handoff fact.
- **LLM execution.** Swap `agent: deterministic-local` → `agent: claude-p`.
- **Cross-repo coordination.** Cite a fact from another repo's `.auto/facts/`
  via `<remote>@<sha>` in a payload field.
- **Trust gates / human approval.** Add `Authority: human` to a skill; the
  runner would pause and require an external `MfaApproved` fact before
  continuing.
- **Progressive automation.** Replace a deterministic skill body with an
  LLM-backed one, then later extract the stable parts back to deterministic.
  The fact-log shape stays the same.

## Lineage

This demo is the first concrete expression of the "3-primitive superset"
framing agreed on 2026-04-22: skill + agent + fact log, with git as the
substrate, conventions on top, everything else composed from those three.
