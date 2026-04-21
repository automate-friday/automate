// examples/stripe-refund-gate.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Purpose — the two-keys-to-launch pattern for AI-triggered financial actions
// ═══════════════════════════════════════════════════════════════════════════
//
// Real production AI use case: Claude (or GPT, or any LLM) handles customer
// support and can PROPOSE refunds. But the LLM cannot be trusted to directly
// fire the Stripe API — it could hallucinate, be prompt-injected, or drift.
//
// The pattern separates authority cryptographically:
//
//   openai-refund-agent  proposes (LLM; might lie)
//   owner                signs matching approval  (root of trust)
//   stripe-gate-agent    deterministic observer — fires Stripe only if BOTH
//                          a proposal and a matching signed approval exist
//                          in the log, within TTL
//   stripe-verifier      post-action check — confirms Stripe's actual state
//                          matches the approved amount; notifies on mismatch
//
// You trust the LLM to be useful. You trust yourself to sign carefully. You
// audit the observer's 20-line claim logic. The verifier catches observer
// drift. Four independent actors; compromise any one, the chain fails closed.
//
// Run: bun examples/stripe-refund-gate.ts

type Fact = {
  id: string; lamport: number; signer: string; prevHash: string;
  signature: string; payload: any; rejectedReason?: string;
};

const log: Fact[] = [];
const subs: Array<(f: Fact) => void> = [];
let nextLamport = 1;
let prevHash = "genesis";
const publicKeys = new Map<string, string>();
const trustedScopes = new Map<string, Set<string>>();

const sign = (signer: string, payload: any) => `sig(${signer}:${JSON.stringify(payload).slice(0, 24)})`;
const verify = (f: Fact) => f.signature === sign(f.signer, f.payload) && publicKeys.has(f.signer);
const hasTrust = (subject: string, scope: string) => !!trustedScopes.get(subject)?.has(scope);

function append(signer: string, payload: any, forgeSig = false): Fact {
  const f: Fact = {
    id: `f${log.length + 1}`, lamport: nextLamport++, signer, prevHash,
    signature: forgeSig ? "sig(FORGED)" : sign(signer, payload),
    payload,
  };
  if (f.payload.kind === "TrustStatement" && f.signer === "owner") {
    const s = trustedScopes.get(f.payload.subject) ?? new Set();
    s.add(f.payload.scope);
    trustedScopes.set(f.payload.subject, s);
  }
  const verdict = reducerCheck(f);
  if (!verdict.ok) f.rejectedReason = verdict.reason;
  log.push(f);
  prevHash = f.id;
  for (const cb of subs) queueMicrotask(() => cb(f));
  return f;
}

// ═══════════════════════════════════════════════════════════════════════════
// Minimal reducer — signature + trust-scope only
// ═══════════════════════════════════════════════════════════════════════════

function reducerCheck(f: Fact): { ok: true } | { ok: false; reason: string } {
  if (!verify(f)) return { ok: false, reason: "bad-signature" };
  const p = f.payload;
  if (p.kind === "DispatchProposed" && p.skillId === "execute-refund") {
    if (!hasTrust(f.signer, "provide:execute-refund")) return { ok: false, reason: "trust-not-granted-for-execute-refund" };
  }
  if (p.kind === "RefundApproved") {
    // Only owner may approve refunds in this scenario
    if (f.signer !== "owner") return { ok: false, reason: "only-owner-may-approve-refunds" };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// The STRIPE-GATE OBSERVER — the 20 lines you audit by eye.
// This is the whole "two-keys-to-launch" logic.
// ═══════════════════════════════════════════════════════════════════════════

const APPROVAL_TTL_LAMPORT = 20;   // approvals expire 20 lamport ticks after signing

function stripeGateCanFire(refundProposal: Fact): { ok: true } | { ok: false; reason: string } {
  // Rule 1: proposal was signed by an agent trusted to propose refunds
  if (!hasTrust(refundProposal.signer, "provide:propose-refund")) {
    return { ok: false, reason: "proposer-not-trusted" };
  }
  // Rule 2: a RefundApproved signed by the owner exists AND matches this proposal
  const approval = log.find(x =>
    x.payload.kind === "RefundApproved"
    && x.payload.matchesProposal === refundProposal.id
    && x.signer === "owner"
    && !x.rejectedReason
  );
  if (!approval) return { ok: false, reason: "no-matching-owner-approval" };
  // Rule 3: approval hasn't expired (TTL)
  if (nextLamport - approval.lamport > APPROVAL_TTL_LAMPORT) {
    return { ok: false, reason: "approval-expired" };
  }
  // Rule 4: this proposal hasn't already been fired
  if (log.some(x => x.payload.kind === "StripeRefundFired" && x.payload.forProposal === refundProposal.id && !x.rejectedReason)) {
    return { ok: false, reason: "already-fired" };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Pretty printer
// ═══════════════════════════════════════════════════════════════════════════

const EMOJI: Record<string, string> = {
  TrustStatement: "📜", SensorEmitted: "📨", DispatchProposed: "📮",
  RefundProposed: "💡", RefundApproved: "✅", StripeRefundFired: "💸",
  DispatchConfirmed: "🟢", VerificationResult: "🔍",
  Notification: "📣", DispatchBlocked: "🔒",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const tag = f.payload.kind;
  const p = f.payload;
  const detail = tag === "StripeRefundFired" ? `$${p.amount} → ${p.customer}  stripe-id=${p.stripeChargeId}` :
                 tag === "VerificationResult" ? `for=${p.forProposal} match=${p.match} (approved=$${p.approvedAmount}, stripe=$${p.stripeActual})` :
                 tag === "RefundProposed" ? `$${p.amount} customer=${p.customer} reason=${(p.reason ?? "").slice(0,30)}` :
                 p.subject ? `${p.subject} / ${p.scope}` :
                 p.sensorId ? `sensor=${p.sensorId}` :
                 p.skillId ? `skill=${p.skillId}` :
                 p.matchesProposal ? `for=${p.matchesProposal}` :
                 p.forProposal ? `for=${p.forProposal}` :
                 p.to ? `to=${p.to}: ${(p.message ?? "").slice(0, 60)}` : "";
  const reject = f.rejectedReason ? `  🔒 REJECTED — ${f.rejectedReason}` : "";
  console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(22)} ${e} ${tag.padEnd(20)} ${detail}${reject}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Agent behaviors as subscribers
// ═══════════════════════════════════════════════════════════════════════════

// Mock Stripe state (external world)
const stripeState: Record<string, { amount: number; status: string }> = {};

// Stripe-gate observer: when a RefundApproved lands, check proposal + fire if valid
subs.push((f) => {
  if (f.payload.kind !== "RefundApproved" || f.rejectedReason) return;
  const proposal = log.find(x => x.id === f.payload.matchesProposal);
  if (!proposal || proposal.payload.kind !== "RefundProposed") return;
  queueMicrotask(() => {
    const verdict = stripeGateCanFire(proposal);
    if (!verdict.ok) {
      append("stripe-gate-agent", { kind: "DispatchBlocked", forProposal: proposal.id, reason: verdict.reason });
      append("stripe-gate-agent", { kind: "Notification", to: "owner", message: `REFUSED to fire refund ${proposal.id}: ${verdict.reason}` });
      return;
    }
    append("stripe-gate-agent", { kind: "DispatchProposed", skillId: "execute-refund", payload: { forProposal: proposal.id } });
    // Stripe API call (mocked)
    const chargeId = `ch_${Math.random().toString(36).slice(2, 10)}`;
    stripeState[chargeId] = { amount: proposal.payload.amount, status: "refunded" };
    append("stripe-gate-agent", {
      kind: "StripeRefundFired",
      forProposal: proposal.id,
      amount: proposal.payload.amount,
      customer: proposal.payload.customer,
      stripeChargeId: chargeId,
    });
    append("stripe-gate-agent", { kind: "DispatchConfirmed", forProposal: proposal.id });
  });
});

// Stripe verifier: after a fire, compare Stripe state against approval amount
subs.push((f) => {
  if (f.payload.kind !== "StripeRefundFired" || f.rejectedReason) return;
  queueMicrotask(() => {
    const proposal = log.find(x => x.id === f.payload.forProposal)?.payload;
    const actual = stripeState[f.payload.stripeChargeId];
    const match = actual?.amount === proposal?.amount && actual?.status === "refunded";
    append("stripe-verifier", {
      kind: "VerificationResult",
      forProposal: f.payload.forProposal,
      match,
      approvedAmount: proposal?.amount,
      stripeActual: actual?.amount,
    });
    if (!match) {
      append("stripe-verifier", { kind: "Notification", to: "owner", message: `MISMATCH on refund ${f.payload.forProposal}: approved $${proposal?.amount}, stripe shows $${actual?.amount}` });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Scenario — four cases
// ═══════════════════════════════════════════════════════════════════════════

for (const agent of ["owner", "openai-refund-agent", "stripe-gate-agent", "stripe-verifier", "rogue-agent", "support-inbox"]) {
  publicKeys.set(agent, `pub-${agent}`);
}

console.log("\n── stripe-refund-gate: LLM proposes, you approve, observer fires, verifier confirms ──\n");

append("owner", { kind: "TrustStatement", subject: "openai-refund-agent", scope: "provide:propose-refund" });
append("owner", { kind: "TrustStatement", subject: "stripe-gate-agent",   scope: "provide:execute-refund" });
append("owner", { kind: "TrustStatement", subject: "stripe-verifier",     scope: "provide:verify-refund" });

// ── CASE 1: Happy path ──────────────────────────────────────────
await new Promise(r => setTimeout(r, 20));
console.log("\n── Case 1: happy path (proposal + owner approves) ──\n");
append("support-inbox", { kind: "SensorEmitted", sensorId: "customer-ticket", reading: { customer: "alice@acme.com", complaint: "billed twice for march" } });
const proposal1 = append("openai-refund-agent", { kind: "RefundProposed", customer: "alice@acme.com", amount: 49.00, reason: "duplicate charge" });
await new Promise(r => setTimeout(r, 20));
append("owner", { kind: "RefundApproved", matchesProposal: proposal1.id });
await new Promise(r => setTimeout(r, 60));

// ── CASE 2: LLM proposes; OWNER DOES NOT APPROVE ─────────────────
console.log("\n── Case 2: LLM proposes, owner does NOT approve ──\n");
const proposal2 = append("openai-refund-agent", { kind: "RefundProposed", customer: "bob@shady.com", amount: 500.00, reason: "customer seems angry" });
// no approval signed. The observer has nothing to fire on. We'll give it 5 lamport
// ticks, then check that no refund fired.
await new Promise(r => setTimeout(r, 40));
// simulate observer's polling: it could notify owner about the pending proposal
append("stripe-gate-agent", { kind: "Notification", to: "owner", message: `proposal ${proposal2.id} awaiting your approval; will not fire without it` });

// ── CASE 3: Rogue forges an approval (bad signature) ─────────────
console.log("\n── Case 3: rogue forges owner's approval signature ──\n");
const proposal3 = append("openai-refund-agent", { kind: "RefundProposed", customer: "eve@evil.com", amount: 999.00, reason: "refund plz" });
append("owner", { kind: "RefundApproved", matchesProposal: proposal3.id }, /* forgeSig */ true);
await new Promise(r => setTimeout(r, 40));

// ── CASE 4: Rogue tries to fire Stripe directly (bypass observer) ─
console.log("\n── Case 4: rogue tries to fire Stripe without being the observer ──\n");
const proposal4 = append("openai-refund-agent", { kind: "RefundProposed", customer: "mallory@evil.com", amount: 777.00, reason: "plz plz" });
append("rogue-agent", { kind: "DispatchProposed", skillId: "execute-refund", payload: { forProposal: proposal4.id } });

await new Promise(r => setTimeout(r, 40));

// ── Summary ──────────────────────────────────────────────────────
const fires = log.filter(f => f.payload.kind === "StripeRefundFired" && !f.rejectedReason);
const verifications = log.filter(f => f.payload.kind === "VerificationResult" && !f.rejectedReason);
const rejected = log.filter(f => f.rejectedReason);

console.log(`\n── Summary ──`);
console.log(`   StripeRefundFired (real Stripe calls): ${fires.length}`);
for (const f of fires) console.log(`     ✅ $${f.payload.amount} to ${f.payload.customer} (${f.payload.stripeChargeId})`);
console.log(`   Verifications: ${verifications.length} (all match=${verifications.every(v => v.payload.match)})`);
console.log(`   Rejected attempts: ${rejected.length}`);
for (const r of rejected) console.log(`     🔒 ${r.signer} tried ${r.payload.kind}: ${r.rejectedReason}`);
