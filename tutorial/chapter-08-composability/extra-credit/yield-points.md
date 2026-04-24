# Extra credit — yield points: when does the projection run?

The chapter body states the rule: **`aggregate-index` runs per-tick for
engines, per-completion for workflows.** That is the default the framework
ships with. This note walks the full design space so you can see why those
defaults hold, and what the override is when your skill has a different
shape.

## The question

The skill index (`.auto/skills/<skill>@<version>/index.jsonl`) is a
projection of every instance log. A projection needs a cadence: when does
`aggregate-index` actually run and append? Options range from "every fact
in every instance" to "never, compute on query." Each has different
chattiness, opacity, author burden, debug ergonomics, and scale limits.

Stress test to keep in mind: a `customer-research` engine that spawns 100
sub-skill-instances per tick, ticking every 30 seconds. A naive per-instance
policy produces ~12,000 index writes/hour on a single engine. A per-tick
policy produces 120.

## Option matrix

| # | Option | Chattiness | Opacity | Author burden | Debug ergonomics | Scale limit | Best-fit scenario |
|---|---|---|---|---|---|---|---|
| 1 | Per-instance completion | High (1 per instance) | Low | None | Excellent — every run has a row | Breaks ~10k inst/sec | Short, meaningful skills; workflows |
| 2 | Per-leaf only | Medium (leaves only) | High for parents | None | Bad — composite skills look unused | Same leaf throughput as #1 | Flat skill graphs |
| 3 | Per-engine-tick | Low–Medium (1/tick/engine) | Medium — loses per-instance granularity | None | Good — `tickId` is the debug key | Excellent | Steady-state controllers |
| 4 | Per-phase-boundary | 3–4× tick rate | Low within tick | None | Very good — phase is the natural seam | Good | Engines with distinct phases |
| 5 | Per-workflow-completion | Very low | High if workflow is long | None | Bad long, great short | Excellent | Fire-and-forget workflows |
| 6 | Time-based rollup | Bounded (N/hour) | High — loses causality | None | Terrible | Excellent | Metrics/analytics |
| 7 | Manual/explicit | Author-controlled | Author-controlled | High | Depends | Depends | Power users, libraries |
| 8 | **Hybrid (engine=#3, workflow=#5)** | Bounded | Bounded | None for defaults | Good | Good | **Framework default** |
| 9 | Materialized-on-query | Zero at write | Zero at read (replay) | None | Medium | Read-heavy breaks | Cold analytics |
| 10 | Fact-triggered (`Yield{}`) | Author-controlled via facts | Author-controlled | Medium | Excellent | Good | Streaming skills with internal checkpoints |

## Tradeoffs worth naming

**Chatty vs. opaque.** Per-instance squash (option 1) on the customer-
research stress test produces ~12,000 index writes/hour on a single
engine. The "semantic" log stops being semantic and turns into a second
episodic firehose. Per-workflow (option 5) on a six-hour workflow gives
you *one fact* for the whole run — you have lost everything interesting.
The engine/workflow split does real work here. Workflows *are* their own
natural unit of completion. Engines never terminate, so they need a
rhythm.

**Author burden.** Option 7 (explicit yield points in every skill) sounds
principled but breaks the "skills are the primitive" invariant — every
MDX author now has to reason about projection semantics before writing a
contract. Framework internals leaking into the happy path is a smell.
Manual yield should exist as an escape hatch, not the default.

**Debug ergonomics.** The question "where is the summary for run X?" must
have an obvious answer. Tick-keyed (options 3, 4) and instance-keyed
(option 1) both satisfy this — `tickId` or `instanceId` is a natural
index. Materialized-on-query (option 9) fails hard: "why is this skill
slow?" requires a full replay. Time-based (option 6) cannot even answer
"what happened during run X" without extra joins.

**Scale.** At 10,000 instances/sec, per-instance squash is a
write-amplification problem — every instance now writes twice (episodic
+ index). Per-tick writes are bounded by `engines × tickRate`, which in
practice is small (hundreds, not thousands). The stress test:
100 sub-instances/tick × 120 ticks/hour = 12,000 writes/hour under
option 1, vs. 120 writes/hour under option 3.

## Recommendation

**Ship hybrid defaults (option 8).**

- **Engine default: `on-tick` (option 3).** Each tick is a reconciliation
  cycle. The commit phase is already a framework-managed seam, so the
  projection fires there. `tickId` becomes the index's primary key.
  Engines never terminate, but they *do* complete ticks, and that is the
  unit worth summarizing.
- **Workflow default: `on-complete` (option 5).** A workflow *is* the
  unit. Squash-on-terminate is the natural semantic — one run, one
  summary fact, `childSkills` array captures the tree. This is git's
  squash-merge and it is the right fit here.
- **Child skill instances inside engines do NOT auto-squash.** They
  accumulate into the tick's summary. This prevents the 12k/hour
  explosion and keeps the index readable. If you want per-child
  granularity, use the override.
- **Override mechanism: a single `yield:` field** in SKILL.md frontmatter
  or engine config.

### DSL sketch

```mdx
---
name: research-competitor
yield: on-instance   # override: every run of this skill summarized separately
---
```

```typescript
auto.engine("customer-research", {
  tick: "30s",
  yield: "on-tick",       // default for engines; specify to be explicit
  observe: [...],
  decide: ...,
  reconcile: ...,
})

auto.workflow("onboard-client", {
  yield: "on-complete",    // default for workflows
  steps: [...],
})
```

One field. Four accepted values:

| Value            | Meaning                                                          |
|------------------|------------------------------------------------------------------|
| `on-tick`        | Projection fires at every tick's commit phase (engine default)   |
| `on-complete`    | Projection fires once when the container terminates (workflow default) |
| `on-instance`    | Every instance's terminal state fires a projection (escape hatch) |
| `manual`         | Author emits `Yield{}` facts in the instance log to trigger      |

Defaults handle the common case; the override exists for the author who
knows something the framework does not.

## Why not per-phase (option 4) as the engine default?

Option 4 (projection at every phase boundary — observe→decide→reconcile→
commit) was a close second. It loses to `on-tick` on two grounds:

1. It is 3–4× chattier with no proportional gain in debugging power.
   `tickId` already localizes the summary; phase-level granularity is
   almost always better answered by reading the episodic log directly.
2. It couples the projection cadence to the engine's internal phase
   structure. If a future engine has five phases instead of four, the
   projection cadence changes implicitly. `on-tick` survives phase
   refactors.

If your engine genuinely benefits from phase-level summaries (for
example, a safety-critical controller where each phase's output is a
distinct artifact), opt in with `yield: on-phase` as a fifth accepted
value. It is not the default because 95% of engines do not need it.

## Why not materialized-on-query (option 9)?

It is attractive — zero write cost, always fresh, pure function of the
instance logs. It fails on read-heavy workloads. "Show me the last 100
runs of this skill across all engines" becomes a tail + parse across
every engine directory, every time. The projected index exists precisely
to amortize that cost.

Materialized-on-query remains a **valid strategy for cold analytics**.
If you have a skill whose index is rarely read, it is fine to skip the
projection entirely and compute on demand. The override value for this
is `yield: on-query` — not in the default four, but reserved for the
case.

## Operational notes

- The projection is **strictly idempotent.** Running `aggregate-index`
  twice against the same episodic log produces the same index. This is
  what makes "delete and rebuild" safe.
- The projection is **strictly local.** `aggregate-index` only reads
  instance logs; it never writes to them. The only thing it writes is
  its own index. Instance-log authors do not need to know the index
  exists.
- The projection is **versioned by skill, not by engine.** All engines
  using `count-to-target@1` contribute to one index. When `@2` lands,
  it gets its own index and `@1`'s keeps working unchanged.

## The one-liner

**Per-tick for engines, per-completion for workflows, with a single
`yield:` override when a skill has a different shape. The framework
ships opinionated defaults so the common case is zero-config; the
escape hatches exist for the 5% of skills where the default is wrong.**
