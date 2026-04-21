// examples/stripe-refund-gate.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Refactored to use the runtime kernel (runtime/) + standard helpers.
//
// Same four-case demo as the original (stripe-refund-gate-original.ts);
// substrate + trust + pretty-printer logic is imported instead of re-rolled.
// ═══════════════════════════════════════════════════════════════════════════

import { runtime, autoFor, prettyLog } from "../runtime";
import { trust, hasTrust, installTrustRule } from "../runtime/trust";

const rt = runtime();
for (const a of ["owner", "openai-refund-agent", "stripe-gate-agent", "stripe-verifier", "rogue-agent", "support-inbox"]) rt.registerKey(a);

// ─── rules ─────────────────────────────────────────────────────────────────
installTrustRule(rt);
rt.rule((f) => {
  const p = f.payload;
  if (p.kind === "DispatchProposed" && p.skillId === "execute-refund"
      && !hasTrust(rt, f.signer, "provide:execute-refund")) return "trust-not-granted-for-execute-refund";
  if (p.kind === "RefundApproved" && f.signer !== "owner") return "only-owner-may-approve-refunds";
  return null;
});

// ─── pretty printer ────────────────────────────────────────────────────────
const auto = autoFor(rt);
rt.subscribe(prettyLog({
  emoji: { SensorEmitted: "📨", RefundProposed: "💡", RefundApproved: "✅", StripeRefundFired: "💸", VerificationResult: "🔍" },
  detail: (p) => {
    if (p.kind === "StripeRefundFired") return `$${p.amount} → ${p.customer}  stripe-id=${p.stripeChargeId}`;
    if (p.kind === "VerificationResult") return `for=${p.forProposal} match=${p.match} (approved=$${p.approvedAmount}, stripe=$${p.stripeActual})`;
    if (p.kind === "RefundProposed") return `$${p.amount} customer=${p.customer} reason=${(p.reason ?? "").slice(0,30)}`;
    if (p.subject) return `${p.subject} / ${p.scope}`;
    if (p.agentId) return `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]`;
    if (p.skillId) return `skill=${p.skillId}`;
    if (p.matchesProposal) return `for=${p.matchesProposal}`;
    if (p.forProposal) return `for=${p.forProposal}`;
    if (p.to) return `to=${p.to}: ${(p.message ?? "").slice(0, 60)}`;
    return p.sensorId ? `sensor=${p.sensorId}` : "";
  },
}));

// ─── the observer gate — the heart of the demo ────────────────────────────
const APPROVAL_TTL_LAMPORT = 20;

function stripeGateCanFire(proposal: any): { ok: true } | { ok: false; reason: string } {
  if (!hasTrust(rt, proposal.signer, "provide:propose-refund")) return { ok: false, reason: "proposer-not-trusted" };
  const approval = rt.find(x => x.payload.kind === "RefundApproved" && x.payload.matchesProposal === proposal.id && x.signer === "owner");
  if (!approval) return { ok: false, reason: "no-matching-owner-approval" };
  if (rt.log.length - approval.lamport > APPROVAL_TTL_LAMPORT) return { ok: false, reason: "approval-expired" };
  if (rt.find(x => x.payload.kind === "StripeRefundFired" && x.payload.forProposal === proposal.id)) return { ok: false, reason: "already-fired" };
  return { ok: true };
}

// ─── agent behaviors as subscribers ────────────────────────────────────────
const stripeState: Record<string, { amount: number; status: string }> = {};

rt.on("RefundApproved", (fact) => {
  const proposal = rt.log.find(x => x.id === fact.payload.matchesProposal);
  if (!proposal || proposal.payload.kind !== "RefundProposed") return;
  queueMicrotask(() => {
    const verdict = stripeGateCanFire(proposal);
    if (!verdict.ok) {
      rt.append("stripe-gate-agent", { kind: "DispatchBlocked", forProposal: proposal.id, reason: verdict.reason });
      rt.append("stripe-gate-agent", { kind: "Notification", to: "owner", message: `REFUSED to fire refund ${proposal.id}: ${verdict.reason}` });
      return;
    }
    rt.append("stripe-gate-agent", { kind: "DispatchProposed", skillId: "execute-refund", payload: { forProposal: proposal.id } });
    const chargeId = `ch_${Math.random().toString(36).slice(2, 10)}`;
    stripeState[chargeId] = { amount: proposal.payload.amount, status: "refunded" };
    rt.append("stripe-gate-agent", { kind: "StripeRefundFired", forProposal: proposal.id, amount: proposal.payload.amount, customer: proposal.payload.customer, stripeChargeId: chargeId });
    rt.append("stripe-gate-agent", { kind: "DispatchConfirmed", forProposal: proposal.id });
  });
});

rt.on("StripeRefundFired", (fact) => {
  queueMicrotask(() => {
    const proposal = rt.log.find(x => x.id === fact.payload.forProposal)?.payload;
    const actual = stripeState[fact.payload.stripeChargeId];
    const match = actual?.amount === proposal?.amount && actual?.status === "refunded";
    rt.append("stripe-verifier", { kind: "VerificationResult", forProposal: fact.payload.forProposal, match, approvedAmount: proposal?.amount, stripeActual: actual?.amount });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Scenario
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n── stripe-refund-gate (runtime-powered): LLM proposes, you approve, observer fires ──\n");

auto.skill("propose-refund", { description: "Draft a refund proposal" });
auto.skill("execute-refund", { description: "Fire the Stripe refund API" });
auto.skill("verify-refund",  { description: "Confirm Stripe's post-refund state matches approval" });

auto.agent("openai-refund-agent", { kind: "ai",     provides: ["propose-refund"] });
auto.agent("stripe-gate-agent",   { kind: "script", provides: ["execute-refund"] });
auto.agent("stripe-verifier",     { kind: "script", provides: ["verify-refund"] });

trust(rt, "openai-refund-agent", "provide:propose-refund");
trust(rt, "stripe-gate-agent",   "provide:execute-refund");
trust(rt, "stripe-verifier",     "provide:verify-refund");

await new Promise(r => setTimeout(r, 20));

console.log("\n── Case 1: happy path ──\n");
rt.append("support-inbox", { kind: "SensorEmitted", sensorId: "customer-ticket", reading: { customer: "alice@acme.com" } });
const p1 = rt.append("openai-refund-agent", { kind: "RefundProposed", customer: "alice@acme.com", amount: 49.00, reason: "duplicate charge" });
await new Promise(r => setTimeout(r, 20));
rt.append("owner", { kind: "RefundApproved", matchesProposal: p1.id });
await new Promise(r => setTimeout(r, 60));

console.log("\n── Case 2: LLM proposes, owner does NOT approve ──\n");
const p2 = rt.append("openai-refund-agent", { kind: "RefundProposed", customer: "bob@shady.com", amount: 500.00, reason: "customer seems angry" });
await new Promise(r => setTimeout(r, 40));
rt.append("stripe-gate-agent", { kind: "Notification", to: "owner", message: `proposal ${p2.id} awaiting approval` });

console.log("\n── Case 3: rogue forges owner's approval signature ──\n");
const p3 = rt.append("openai-refund-agent", { kind: "RefundProposed", customer: "eve@evil.com", amount: 999.00, reason: "refund plz" });
rt.forge("owner", { kind: "RefundApproved", matchesProposal: p3.id });
await new Promise(r => setTimeout(r, 40));

console.log("\n── Case 4: rogue tries to fire Stripe without being the observer ──\n");
const p4 = rt.append("openai-refund-agent", { kind: "RefundProposed", customer: "mallory@evil.com", amount: 777.00, reason: "plz plz" });
rt.append("rogue-agent", { kind: "DispatchProposed", skillId: "execute-refund", payload: { forProposal: p4.id } });
await new Promise(r => setTimeout(r, 40));

const fires = rt.filter(f => f.payload.kind === "StripeRefundFired");
const rejected = rt.log.filter(f => f.rejectedReason);

console.log(`\n── Summary ──`);
console.log(`   StripeRefundFired: ${fires.length}`);
for (const f of fires) console.log(`     ✅ $${f.payload.amount} to ${f.payload.customer}`);
console.log(`   Rejected by reducer: ${rejected.length}`);
for (const r of rejected) console.log(`     🔒 ${r.signer} tried ${r.payload.kind}: ${r.rejectedReason}`);
console.log(`\n   Substrate imported from runtime/. Scenario-specific rules: 6 lines.`);
