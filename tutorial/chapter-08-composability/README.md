# Chapter 8 — composability: one skill, many engines

**The same skill definition is reused by two engines. Each reuse has its
own instance log. A framework-owned projection skill maintains a
cross-engine index of every place the skill has run.**

Chapter 7 introduced engines composing two *different* skills. This
chapter flips the axis again: **one skill reused across two different
engines.** The `count-to-target` skill you met in chapters 4–5 gets
dropped into two engines at once — one counting to 10, one counting to
100 — and each engine gets its own instance log. The skill definition
has no log of its own.

This chapter locks in the mental model for the rest of the framework:

> **A log belongs to the place a skill is used, not to the skill itself.**
> The skill is a definition. Each use of it is an instance. The instance
> is what has state.

## The delta from chapter 7

- The same skill (`count-to-target@1`) now appears in two engines.
- Each engine has its own instance log for that skill — the two histories
  are completely isolated from each other.
- A new framework-owned skill, `aggregate-index`, observes every instance
  log and maintains a per-skill-version index at
  `.auto/skills/<skill>@<version>/index.jsonl`.
- Skill definitions now version their paths properly (`@1`, `@2`, …) so
  that readers can distinguish summaries across schema evolution.

Nothing else changes. Governance (chapter 3), reactivity (chapter 5),
replay (chapter 6) all carry over.

## The React analogy (the mental model)

If you have written React, this mapping is the whole chapter:

| React                       | Automate                                     |
|-----------------------------|----------------------------------------------|
| Component file              | Skill definition (`SKILL.md`)                |
| Component in a tree         | Skill-instance inside an engine              |
| Props                       | Skill inputs (contract)                      |
| Local state                 | Instance log                                 |
| Rendering                   | Reconciling                                  |
| Context                     | Parent engine's log                          |
| Parent tree                 | Engine / tenant                              |
| React DevTools tree view    | `aggregate-index` of a skill's every instance |

A `<Button>` file does not have state. A `<Button>` *in* a tree has its
own focus, hover, and disabled flags. Same shape here: the skill file
does not have a log; each *use* of the skill in an engine does.

## Layout

```
tutorial/chapter-08-composability/
├── .auto/
│   ├── skills/
│   │   └── count-to-target@1/
│   │       ├── SKILL.md                               ← definition only
│   │       ├── schemas.ts
│   │       └── index.jsonl                            ← projection (not a log of truth)
│   ├── engines/
│   │   ├── count-to-ten/
│   │   │   ├── ENGINE.md
│   │   │   ├── log.jsonl
│   │   │   └── instances/
│   │   │       └── count-to-target/
│   │   │           └── log.jsonl                      ← target=10 history
│   │   └── count-to-one-hundred/
│   │       ├── ENGINE.md
│   │       ├── log.jsonl
│   │       └── instances/
│   │           └── count-to-target/
│   │               └── log.jsonl                      ← target=100 history
│   ├── agents/
│   │   ├── openclaw.md
│   │   └── hermes.md
│   └── adapters/
│       └── git-run
```

One skill definition. Two engine instance logs. One projected index.
Zero cross-contamination between the engines.

## The scoping rule (expanded)

```
.auto/engines/<engine>/log.jsonl                              engine-level lifecycle
.auto/engines/<engine>/instances/<skill>/log.jsonl            episodic (per skill-use)
.auto/skills/<skill>@<version>/index.jsonl                    projected aggregate
.auto/domain/<entity>/<id>/log.jsonl                          domain entity state
```

Four log kinds, each with a clear scope and reason to exist:

- **Engine log** — what the engine itself did, tick by tick.
- **Instance (episodic) log** — full history of one skill-use in one
  engine. This is the source of truth for debugging.
- **Skill index** — projected summary of every instance of this skill
  version across every engine. *Derived*, not truth; rebuildable from the
  instance logs.
- **Domain log** — state of a long-lived entity (Customer, Project,
  Invoice). Referenced by engines, owned by neither.

## Episodic vs. projected: truth and view

**The instance log is the only source of truth.** It is append-only, owned
by the skill-in-engine scope, and never overwritten. If you want to know
what happened in a specific run, read the instance log — it is local,
bounded, and complete.

**The skill index is a projection.** It is maintained by a framework-
shipped skill called `aggregate-index`. Its job is to tail every instance
log for a given skill version and append one summary fact per observable
event:

```
.auto/skills/count-to-target@1/index.jsonl
  { Genesis                                                            by framework }
  { InstanceStarted    engine: count-to-ten              target: 10    by aggregate-index }
  { CountObserved      engine: count-to-ten   n: 1                     by aggregate-index }
  { CountObserved      engine: count-to-ten   n: 2                     by aggregate-index }
  { InstanceStarted    engine: count-to-one-hundred      target: 100   by aggregate-index }
  …
  { InstanceCompleted  engine: count-to-ten   totalCounts: 10          by aggregate-index }
```

If the index is corrupted or lost, delete and rebuild — it is a **pure
function** of the instance logs. No two-phase-commit, no cross-store
atomicity, no drift. One source of truth (episodic), one derived view
(projected).

The frequency at which `aggregate-index` runs is a yield-point policy
choice. Sensible defaults: **per-tick for engines, per-completion for
workflows.** The `extra-credit/yield-points.md` file in this chapter
walks the full combinatorial design space and defends those defaults.

## Example: `count-to-target@1` reused in two engines

**`.auto/engines/count-to-ten/ENGINE.md`:**
```yaml
name: count-to-ten
skills:
  - count-to-target@1
target: 10
agents: [openclaw, hermes]
```

**`.auto/engines/count-to-one-hundred/ENGINE.md`:**
```yaml
name: count-to-one-hundred
skills:
  - count-to-target@1
target: 100
agents: [hermes]
```

After running both to completion:

```
.auto/engines/count-to-ten/instances/count-to-target/log.jsonl
  { Genesis        target:10                  by engine   }
  { Count  n=1                                by openclaw }
  { Count  n=2                                by hermes   }
  …
  { Count  n=10                               by openclaw }

.auto/engines/count-to-one-hundred/instances/count-to-target/log.jsonl
  { Genesis        target:100                 by engine   }
  { Count  n=1                                by hermes   }
  { Count  n=2                                by hermes   }
  …
  { Count  n=100                              by hermes   }
```

Completely isolated. Adding a third engine that also reuses
`count-to-target@1` is a new directory under `engines/` and a new
`ENGINE.md`. No change to the skill. No change to either existing engine.

## Why versioning matters (and why it is in the path)

`count-to-target@1` is a schema stamp. If the skill's fact shape evolves
(`Count` gains a `label: string` field), that is a new version:
`count-to-target@2`. It gets its own path, its own index, and readers can
distinguish. Engines that bound to `@1` keep working; new engines can bind
to `@2`.

**Never rewrite an `@n` once it is in use.** Increment instead. This is
the same discipline that event-sourcing systems learned the hard way:
schema drift within a single log corrupts every reader at once. Versioning
in the path eliminates that class of bug.

## Tenancy lives in the path, not the payload

In a multi-tenant deployment, the engine path prefix identifies the
tenant:

```
.auto/tenants/<tenantId>/engines/<engine>/instances/<skill>/log.jsonl
.auto/tenants/<tenantId>/skills/<skill>@<version>/index.jsonl
```

Alice and Bob's usage of the same skill land in different indexes because
they land in different paths. Aggregation across tenants (if authorized)
is an opt-in observer skill that unions across tenants explicitly. **Do
not put `tenantId` as a payload field in a shared log.**

## Cross-instance queries when you want them

The projected index gives you "how is this skill used" for free. For
anything more specific — "which engines have this skill failing more than
5% of the time?" — write another observer skill on top of the index:

```
.auto/skills/aggregate-failure-rate@1/
  SKILL.md    # reads every skill's index.jsonl, appends FailureRate facts
```

Cross-cutting analytics is **additive**, not a default scope. The
debugging default stays local to the engine.

## Domain entities still have their own logs

A `Customer` or `Project` lives in its own scope and is referenced by
engines, not owned by them:

```
.auto/domain/customers/<customer-id>/log.jsonl
  { Genesis                                  by crm-observer }
  { EmailUpdated   email: alex@acme.com      by alex         }
  { TierChanged    tier: enterprise          by sales-ops    }
```

An engine whose reconcile phase involves a customer reads the domain log
and appends `EngagedCustomer { customerId: … }` to its own instance log.
The customer's canonical record stays in the domain log. This is the DDD
aggregate boundary applied to the log model: **engine-shaped state is
engine-scoped; domain-shaped state is domain-scoped.**

## Debuggability at scale

This scoping is what keeps the fact-log model from becoming
CODASYL-by-accident:

- **Local by default.** "What happened in engine X" means reading a
  bounded tree of logs, not filtering a global firehose.
- **Instance-isolated.** The same skill used in two engines cannot
  contaminate each other's history.
- **One source of truth.** The index is a pure projection — if you doubt
  it, rebuild from the instance logs. No sync protocols, no drift.
- **Relational on demand.** Cross-instance views exist as observer skills
  on top of the index. They are opt-in, not the default scope.
- **Lineage-traceable.** Every fact's path (`engine/instance`) tells you
  where it came from before you read the contents.

Debug tooling — log-tree visualizer, fact-lineage trace, scope filter —
is itself just observer skills on top of the primitives. You do not need
a new runtime to debug this model.

## What this validates

- A skill defines behavior; an engine-instance carries state.
- Adding an engine that reuses an existing skill is additive: a new
  directory, a new `ENGINE.md`, no change to the skill.
- The debugging unit is the engine (bounded tree of logs), not the skill
  (unbounded global log).
- Cross-instance views exist and are useful, but they are *projected from
  the episodic logs*, never the default scope.
- Versioning and tenancy live in the path. Schema drift and tenant
  bleed-through are addressed structurally, not by convention.
- Domain entities live in their own scope and are observed by engines,
  not owned by them.

## What's next (not in Chapter 8)

- **Chapter 9 — skill calls skill.** A composite skill (`double-counter`)
  whose reconcile phase invokes `count-to-target@1` twice as child
  instances, each with its own log. The composition graph falls out
  visibly from the tree of instance logs.
- **Chapter 10 — derived state.** An observer skill folds over the
  projected index to compute a live derived value (like a running total,
  or a rolling average). This is the "React tutorial with agents"
  moment — unidirectional data flow, shared source of truth, reactive
  views.
- **Chapter 11 — stream operators.** A tiny library of reusable observer
  skills (filter, map, merge, throttle, scan) that compose most new
  workflows without writing new business logic. Where the RxJS / Effect
  Stream vocabulary lands.

## The one-liner

**Logs are instance state, not definition state. The skill is the
component; each use gets its own log; a framework-owned projection keeps
a derived index of every use. Debugging is local by default; analytics is
a pure function of the episodic logs; versioning and tenancy are in the
path so schema drift and cross-tenant leakage cannot happen by accident.**

## Extra credit

See `extra-credit/yield-points.md` for the combinatorial analysis of
*when* the projection runs — per tick, per completion, per instance,
per phase — and why the recommended defaults (tick for engines,
completion for workflows) hold up under stress.
