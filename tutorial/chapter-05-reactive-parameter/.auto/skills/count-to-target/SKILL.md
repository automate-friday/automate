---
name: count-to-target
description: Cooperatively count toward a target that can change at runtime. Agents react to TargetChanged facts in the log.
---

# Count to Target

Like `count-to-ten` (chapter 4), two or more agents cooperate to count up —
but the target is no longer hard-coded. The target is declared in Genesis
and can be changed at runtime by appending a `TargetChanged` fact. Agents
notice on the next tick and adapt.

**The delta from chapter 4: a parameter lives in the log, and agents react
to it.** No new framework machinery — just a new fact kind and a new read
step in the protocol.

## Fact kinds

**Genesis** — the initial target:

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<creator>", "kind": "Genesis",
  "payload": { "skill": "count-to-target", "target": <int> } }
```

**TargetChanged** — append to update the target at runtime:

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<who>", "kind": "TargetChanged",
  "payload": { "target": <int> } }
```

**Count** — appended by an agent taking its turn:

```json
{ "id": "<12 hex>", "at": "<ISO>", "by": "<agent id>", "kind": "Count",
  "payload": { "n": <int> } }
```

## Derived state (computed on every read, never stored)

- `target` = payload of the latest `TargetChanged`, falling back to Genesis `target`.
- `current` = `n` of the latest `Count`, or 0 if none.
- `last.by` = `by` of the latest `Count`, or none.

## Protocol

1. **Read** the log.
2. Compute `target` and `current`.
3. **If** `current >= target`: pass. We're at or past the target — do nothing.
4. **If** the latest `Count`'s `by` equals my agent id: pass. Another agent
   must take the next turn (strict alternation, as in chapter 4).
5. **Otherwise** append `Count { n: current + 1, by: me }`.
6. Commit + push.

## Reactivity — how a parameter change propagates

There is **no subscription, no callback, no event bus**. The agent reads
the log on every tick. The "latest" values are recomputed each time. A new
`TargetChanged` fact is simply picked up on the next read. That's the whole
mechanism.

This is the point of the chapter: **reactivity emerges from reading the
log before each decision**. It is not a framework feature.

## Behaviour when target shrinks below current

If someone appends `TargetChanged { target: 5 }` when `current = 12`, we
have `current >= target`. By rule 3 the agents pass. They do **nothing**
— no rewind, no Adjust fact, no alarm. The log is append-only; history is
preserved. `current` stays at 12.

If the target later grows past 12 (e.g. `TargetChanged { target: 25 }`),
rule 3 no longer fires and counting resumes from 13.

Chosen explicitly: **pass-and-freeze** rather than rewinding. Rationale:
- It keeps the fact shape minimum (no `Adjust` or `Reset` kinds).
- Counts are permanent records of work done; we don't retract them.
- A target *below* `current` is a declaration of "we've overshot," not a
  rollback request. If the user wants a true reset, they start a new
  skill instance.

Other behaviours would be valid (rewind via `Adjust { n: target }`, or
treat shrink as "done"), but this chapter commits to one clear rule and
documents it here.

## What makes this work without direct communication

Same as chapter 4. Git is the substrate. The log is the shared state.
Every agent pulls, reads, computes, writes. The only new thing is that
the *target* is now also in the log instead of being a hard-coded
constant in `counter.ts`.
