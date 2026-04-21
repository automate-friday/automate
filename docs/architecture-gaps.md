# Architecture Gaps — What "Production" Requires

> External review (Cursor, 2026-04-21) after the conceptual-core work landed. Captured here so the distinction between "conceptually proven" and "production-ready" stays explicit. These gaps are **execution semantics**, not new primitives — the two-primitive DSL (skill + agent) + the append-only log substrate stand.

## Where the repo is strong

- **Progressive automation is the actual product** — "skill stays constant, executor changes as trust grows" is the differentiating north star.
- **Separation of authority** (see `examples/stripe-refund-gate.ts`): proposer ≠ approver ≠ executor ≠ verifier. Four independent actors, chain fails closed on compromise of any one. This is the sharpest wedge.
- **Proof-first shipping** (see `examples/pr-with-proof.ts`): the reducer rejects forgeries deterministically. The log is proof, not philosophy.
- **Safety-kernel vibe**: small reducer/observer as the thing you actually audit; everything else is treated as potentially adversarial.

## The production gap

The concept is production-shaped. The substrate semantics aren't yet.

### 1. Replay contract
Capture *all* non-determinism as facts — time, RNG, external responses, LLM output, ordering decisions. Otherwise "deterministic governance" diverges on replay. Every projection must be reproducible from the log alone.

### 2. Idempotency + crash safety
Side effects to external systems (Stripe, Git, Slack) must be safe under retries and restarts. Log-level `already-fired` is not enough if a process crashes *after* the external call but *before* logging it. Needs idempotency keys, effect journaling, and a recovery protocol.

### 3. Time model
Lamport-based TTL is demo-friendly but governance-incorrect. A 5-minute approval window must mean 5 wall-clock minutes. Wall-clock deadlines need to be recorded as facts (e.g., `TimeAdvanced` or `DeadlineReached`) so replay gives the same verdict.

### 4. Concurrency, leases, backpressure
`DispatchClaimed` needs leases + fencing tokens, otherwise a stalled agent still holds work the network could re-assign. Subscriber microtasks need bounded queues and failure containment — otherwise a buggy subscriber can starve the runtime.

### 5. Log ↔ world reconciliation
Verifiers are not optional — they're the pattern. The four-actor template needs a generalized "plant mismatch" incident flow: what happens when Stripe shows a state the log doesn't predict? Who is authorized to reconcile? What fact records the reconciliation decision?

### 6. Secrets and PII reality of append-only
"Forever tape" collides with compliance. Early architectural stance needed on: pointers-only artifacts (content-addressed blobs outside the log), encryption at rest, redaction without breaking hash chains, key-shred patterns for right-to-erasure.

## Where the repo is most likely to be misunderstood

- **Could look like another workflow / YAML tool** unless the governance substrate is felt immediately. The four-actor pattern (propose/approve/execute/verify) needs to be the *first* thing a visitor sees, not a demo they dig into.
- **Progressive automation can become progressive slowdown** without a good human-approvals interface. Approval fatigue, low-context approvals, unclear diffs kill the value. A minimal "approval inbox + log viewer" with readable "what will happen if I approve" diffs is load-bearing.

## Recommended next work

Ordered by leverage:

1. **Make the reducer/rule system the hero.** Standardize on the AER `Rule[]` pattern from `examples/pr-with-proof.ts` as the official way to express governance checks. Every example should use it.

2. **Define a minimal execution protocol** (not new DSL primitives): idempotency keys, effect journaling, claim leases, retry policy — all expressible as fact kinds the reducer knows about.

3. **Replace Lamport TTL with wall-clock deadlines.** Record time-advance decisions as facts so replay gives the same verdict.

4. **Codify the four-actor safety pattern** (propose/approve/execute/verify) as a first-class documented template. This is the sharpest wedge and deserves its own spec page.

5. **Pick a boring default substrate** for early users (Postgres + a process, or Git + cron) to avoid a support-matrix explosion. The multi-transport vision stays; ship one path first.

6. **Build the 5-minute experience**: approval inbox + log viewer showing `Proposed → Approved → Fired → Verified` with readable diffs of "what will happen if I approve." Without this the strongest ideas stay theoretical.

## What's deliberately out of scope for this layer

- No new DSL primitives. Every gap above fits in `auto.skill` + `auto.agent` + reducer rules.
- No new trust model. Crypto + signed facts + content-addressed artifacts are the substrate.
- No consensus protocol. Lamport + deterministic reducer are enough; these gaps are about wall-clock, idempotency, and human UX, not distributed agreement.

## Status

This document captures external review; implementing these is post-conceptual work. The two-primitive DSL + four worked examples are the proof that the concept is sound. Production shape of the runtime is the next multi-month engineering effort.
