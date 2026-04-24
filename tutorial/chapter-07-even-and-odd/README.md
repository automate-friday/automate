# Chapter 7 — two skills, one engine

**Two different skills run inside the same engine. Each owns its own log.
They share the engine scope and nothing else.**

Chapter 4 had two agents collaborating on *one* skill (`count-to-ten`).
This chapter flips the axis: **two skills collaborating inside one engine.**
An `evens` skill walks the even numbers up to the target; an `odds` skill
walks the odds. Together they fill in the sequence `1, 2, 3, 4, …, 10`.
Neither skill knows the other exists. They coordinate only through the
engine that composes them.

This is the first chapter that introduces an **engine** as its own
first-class primitive (skills, agents, and logs carry over unchanged from
prior chapters).

## The delta from chapter 6

- New primitive: **engine.** An engine is a long-running composition of
  skills with a declared lifecycle. It has its own scope and its own
  high-level log for engine-level facts (`TickStarted`, `TickCompleted`).
- New addressing: skill-uses live under the engine at
  `.auto/engines/<engine>/instances/<skill>/log.jsonl`.
- Skill-definition paths now include a version: `.auto/skills/<skill>@<version>/`.
  This is a forward-looking convention that matters more in chapter 8.
- Two skills, not one, composed by a single engine.

## The primitives, now four

- **Skill** — unchanged. Natural-language contract plus a fact shape.
- **Agent** — unchanged. Anything that can execute a skill.
- **Fact log** — unchanged. Append-only JSONL. First line is Genesis.
- **Engine** — *new.* A composition of skills with a declared lifecycle.
  Each tick, every composed skill gets a chance to contribute to its own
  instance log. The engine's own log records the lifecycle.

Workflows (from chapter 9 onward) are a special case of engines: a
one-shot engine that terminates once its skills reach a terminal state.

## Layout

```
tutorial/chapter-07-even-and-odd/
├── evens.ts                                  ← agent code for evens
├── odds.ts                                   ← agent code for odds
└── .auto/
    ├── skills/
    │   ├── count-evens@1/
    │   │   └── SKILL.md                      ← append next even ≤ target
    │   └── count-odds@1/
    │       └── SKILL.md                      ← append next odd ≤ target
    ├── engines/
    │   └── count-both/
    │       ├── ENGINE.md                     ← composes both skills
    │       ├── log.jsonl                     ← engine-level lifecycle facts
    │       └── instances/
    │           ├── count-evens/
    │           │   └── log.jsonl             ← evens-only history
    │           └── count-odds/
    │               └── log.jsonl             ← odds-only history
    ├── agents/
    │   ├── openclaw.md
    │   └── hermes.md
    └── adapters/
        └── git-run
```

Two skills. Two instance logs. One engine log that ties them together.

## The engine (ENGINE.md)

```yaml
name: count-both
target: 10
skills:
  - count-evens@1
  - count-odds@1
```

That's the whole engine declaration. The engine says *which skills it
composes* and nothing about how they coordinate internally. The skills
each carry their own protocol.

## The two skills

**`count-evens@1`**
1. Read the instance's log under the calling engine.
2. Find the last `EvenCount` fact (if none, start from 0).
3. If `last.n + 2 > target`: done.
4. Else append `EvenCount { n: last.n + 2 }`.

**`count-odds@1`**
1. Read the instance's log under the calling engine.
2. Find the last `OddCount` fact (if none, start from -1).
3. If `last.n + 2 > target`: done.
4. Else append `OddCount { n: last.n + 2 }`.

Neither skill mentions the other. Their logs never touch.

## Expected logs after the engine runs to completion

```
.auto/engines/count-both/log.jsonl
  { Genesis                                   by jacob    }
  { TickStarted     tickId: 1                 by engine   }
  { TickCompleted   tickId: 1                 by engine   }
  { TickStarted     tickId: 2                 by engine   }
  …

.auto/engines/count-both/instances/count-evens/log.jsonl
  { Genesis        target:10                  by engine   }
  { EvenCount  n=2                            by openclaw }
  { EvenCount  n=4                            by hermes   }
  { EvenCount  n=6                            by openclaw }
  { EvenCount  n=8                            by hermes   }
  { EvenCount  n=10                           by openclaw }

.auto/engines/count-both/instances/count-odds/log.jsonl
  { Genesis        target:10                  by engine   }
  { OddCount   n=1                            by hermes   }
  { OddCount   n=3                            by openclaw }
  { OddCount   n=5                            by hermes   }
  { OddCount   n=7                            by openclaw }
  { OddCount   n=9                            by hermes   }
```

Interleave the logs by timestamp and you reconstruct the full sequence
1, 2, 3, …, 10 — even though neither skill ever saw the other's numbers.

## What agents do across multiple skills

An agent can execute any skill it is authorized for. In this chapter both
`openclaw` and `hermes` are authorized for both skills. Their per-tick
decision: which skills still need work, pick one, run it.

```
AGENT=openclaw ./.auto/adapters/git-run bun tutorial/chapter-07-even-and-odd/evens.ts
AGENT=hermes   ./.auto/adapters/git-run bun tutorial/chapter-07-even-and-odd/odds.ts
```

You can also wire one agent exclusively to one skill (openclaw only runs
evens, hermes only runs odds). The engine doesn't care — agents bind to
skills, not to engines.

## Why this matters — the principle

Two skills composed in one engine demonstrate the **skill-as-isolated-unit**
property:

- Each skill owns its own fact shape (`EvenCount` vs. `OddCount`).
- Each skill owns its own instance log (`count-evens/log.jsonl` vs.
  `count-odds/log.jsonl`).
- Each skill has its own protocol (read its log, decide, append).
- The engine composes them with no shared state between skills.

This is what makes adding a third skill (`count-thirds`, `count-primes`,
`notify-on-done`) additive: drop it in `skills/`, add it to `ENGINE.md`,
done. No refactor of the existing skills. No shared coordinator. No
cross-skill contract.

## What this validates

- Engines are a real primitive — they compose skills, they have their own
  lifecycle log, they define the collaboration scope.
- Two skills can run in parallel inside one engine without any shared
  writer or mutual awareness.
- Skill isolation means adding a new skill to an existing engine is
  additive, not a refactor.
- The addressing scheme
  `.auto/engines/<engine>/instances/<skill>/log.jsonl` cleanly separates
  engine-level history from per-skill-instance history.
- The `@version` segment on skill-definition paths is present but not
  yet load-bearing. It becomes load-bearing in chapter 8.

## What's next (not in Chapter 7)

- **Chapter 8 — composability.** The *same* `count-evens@1` skill reused
  in a second engine (say, `count-both-by-100`) gets its own instance log
  there. Two engines, two logs, one skill definition. The React analogy
  (skill = component, skill-use = instance, log = instance state) locks
  in, along with a framework-owned projection skill that maintains
  per-skill-version aggregate indexes.
- **Chapter 9 — skill calls skill.** A `double-counter` skill whose
  reconcile step invokes `count-to-target` twice as sub-instances.
- **Chapter 10 — derived state.** An observer skill that folds across
  instance logs to compute a live total.
