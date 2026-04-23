# Chapter 5 — a parameter lives in the log

**The target is no longer a constant in the code. It lives in the log. The
agents react.**

In chapter 4 we hard-coded `TARGET = 10` inside `counter.ts`. That worked,
but if we wanted to change the target we'd have to redeploy the code to
every agent. This chapter moves the target into the log as a fact. Now
anyone who can append to the log can change the target at runtime, and
every agent picks it up on its next tick — no restart, no redeploy.

## The delta from chapter 4

- New fact kind: `TargetChanged { target: N }`.
- Genesis now carries the *initial* target in its payload instead of it
  being a hard-coded constant.
- `counter.ts` derives `target` from the log on every tick (latest
  `TargetChanged`, falling back to Genesis).
- The turn-taking rule is unchanged (strict alternation, "not me last").

That's it. No framework changes, no new agent kinds, no subscriptions, no
event bus. One new fact kind + one new read step.

## Layout

```
tutorial/chapter-05-reactive-parameter/
├── counter.ts                                  ← same agent code on every host
└── .auto/
    ├── skills/count-to-target/
    │   ├── SKILL.md                            ← target + turn-taking protocol
    │   └── log.jsonl                           ← Genesis + TargetChanged + Counts
    ├── agents/
    │   ├── openclaw.md
    │   └── hermes.md
    └── adapters/
        └── git-run                             ← pull → counter.ts → commit → push
```

## How reactivity emerges

There is no subscription and no event. Every tick the agent:

1. Pulls the log.
2. Recomputes `target` (latest `TargetChanged`, or Genesis).
3. Recomputes `current` (latest `Count`).
4. Decides whether to count.

Because the derived state is recomputed on every read, any new
`TargetChanged` fact is "seen" the next time any agent wakes up. No
callback plumbing; reading the log *is* the subscription.

This is deliberate. The framework has no runtime kernel, no reactive
engine object, no workflow DAG. Reactivity is a property of the *protocol*
(read before decide), not of the framework.

## Behaviour when the target shrinks below `current`

This is the interesting case. Suppose `current = 5` and someone appends
`TargetChanged { target: 3 }`. Now `current >= target` — we've overshot.

**This chapter's choice: pass and freeze.** Agents do nothing. The log
is append-only; the existing Counts stand. `current` stays at 5. If the
target is later raised above 5, counting resumes from 6.

Rationale:
- Keeps the fact shape minimum (no `Adjust` or `Reset` kinds).
- Counts are records of work done; we don't retract them.
- The skill's README documents this. Other agents written for the same
  skill must honour it.

## Expected log evolution

This chapter ships a `log.jsonl` that already shows the full cycle:

```
{ Genesis          target:10   by jacob    }   ← initial target
{ Count   n=1                  by openclaw }
{ Count   n=2                  by hermes   }
{ Count   n=3                  by openclaw }
{ TargetChanged    target:20   by jacob    }   ← user raises target
{ Count   n=4                  by hermes   }
{ Count   n=5                  by openclaw }
{ TargetChanged    target:3    by jacob    }   ← user shrinks target (overshoot)
                                               ← (no Count facts appended: pass-and-freeze)
{ TargetChanged    target:7    by jacob    }   ← user raises target back up
{ Count   n=6                  by hermes   }
{ Count   n=7                  by openclaw }   ← target reached
```

Read the log top-down and you can reconstruct every decision by running
the protocol in your head.

## Running it locally

```
# one agent counts
AGENT=openclaw bun tutorial/chapter-05-reactive-parameter/counter.ts

# another agent takes the next turn
AGENT=hermes   bun tutorial/chapter-05-reactive-parameter/counter.ts

# change the target by hand (append a TargetChanged fact; in production the
# git-run adapter + a human PR would do this)
```

In production each agent runs under cron via `.auto/adapters/git-run`
(same as chapter 4). See `.auto/agents/openclaw.md` and `.auto/agents/hermes.md`
for the invocation and cron.

## What this validates

- A runtime parameter can live in the log as a fact.
- Agents react to it without any subscription machinery.
- The behaviour when the parameter "goes bad" (target below current) is
  part of the **skill contract**, documented in SKILL.md, not hidden in
  the framework.
- Progress from chapter 4 is exactly one new fact kind and one new read
  step. Nothing else changed.
