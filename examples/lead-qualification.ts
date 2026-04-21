// examples/lead-qualification.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Pattern — announce → propose → accept → graduate
// ═══════════════════════════════════════════════════════════════════════════
//
// The user declares a need. Multiple capable agents propose plans (method +
// cost + ETA). The user accepts one proposal. The chosen agent does the work
// under an approval gate. After N successful runs with zero rejections, the
// gate relaxes automatically — progressive automation via reputation.
//
// This is the marketplace + graduation pattern. Six leads arrive over time:
// the first three go through owner approval; runs 4-6 auto-confirm because
// the agent graduated.
//
// Run: bun examples/lead-qualification.ts

type Fact = { id: string; lamport: number; signer: string; prevHash: string; signature: string; payload: any; rejectedReason?: string };

const log: Fact[] = [];
const subs: Array<(f: Fact) => void> = [];
let nextLamport = 1;
let prevHash = "genesis";
const publicKeys = new Map<string, string>();
const trustedScopes = new Map<string, Set<string>>();

const sign = (s: string, p: any) => `sig(${s}:${JSON.stringify(p).slice(0, 20)})`;
const verify = (f: Fact) => f.signature === sign(f.signer, f.payload) && publicKeys.has(f.signer);
const hasTrust = (subj: string, scope: string) => !!trustedScopes.get(subj)?.has(scope);

function append(signer: string, payload: any): Fact {
  const f: Fact = { id: `f${log.length + 1}`, lamport: nextLamport++, signer, prevHash, signature: sign(signer, payload), payload };
  if (payload.kind === "TrustStatement" && signer === "owner") {
    const s = trustedScopes.get(payload.subject) ?? new Set(); s.add(payload.scope); trustedScopes.set(payload.subject, s);
  }
  const v = reducerCheck(f);
  if (!v.ok) f.rejectedReason = v.reason;
  log.push(f); prevHash = f.id;
  for (const cb of subs) queueMicrotask(() => cb(f));
  return f;
}

function reducerCheck(f: Fact): { ok: true } | { ok: false; reason: string } {
  if (!verify(f)) return { ok: false, reason: "bad-signature" };
  const p = f.payload;
  // Only trusted agents may propose qualify-lead
  if (p.kind === "ProposalOffered" && !hasTrust(f.signer, "provide:qualify-lead"))
    return { ok: false, reason: "not-trusted-to-propose" };
  // Only owner may accept proposals
  if (p.kind === "ProposalAccepted" && f.signer !== "owner")
    return { ok: false, reason: "only-owner-may-accept-proposals" };
  // Only owner may sign approvals
  if (p.kind === "DispatchApproved" && f.signer !== "owner")
    return { ok: false, reason: "only-owner-may-approve" };
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Graduation rule: after N successful confirmations without rejection, relax.
// This is the "reputation as projection" story: no special reputation system —
// it's just a count over the log.
// ═══════════════════════════════════════════════════════════════════════════

const GRADUATION_THRESHOLD = 3;

function isGraduated(agent: string, skill: string): boolean {
  const confirms = log.filter(f =>
    f.payload.kind === "DispatchConfirmed" && f.payload.byAgent === agent && f.payload.skillId === skill && !f.rejectedReason
  ).length;
  const rejects = log.filter(f =>
    f.payload.kind === "DispatchRejected" && f.payload.byAgent === agent && f.payload.skillId === skill && !f.rejectedReason
  ).length;
  return confirms >= GRADUATION_THRESHOLD && rejects === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Pretty printer
// ═══════════════════════════════════════════════════════════════════════════

const EMOJI: Record<string, string> = {
  SkillRegistered: "📘", AgentOffered: "🤝", TrustStatement: "📜",
  CapabilityRequested: "💭", ProposalOffered: "💡", ProposalAccepted: "🎯",
  LeadReceived: "📨", DispatchProposed: "📮", DispatchApproved: "✅",
  DispatchClaimed: "🙋", DispatchConfirmed: "🟢", Notification: "📣",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const p = f.payload;
  const detail = p.skillId ? `skill=${p.skillId}` :
                 p.agentId ? `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]` :
                 p.subject ? `${p.subject} / ${p.scope}` :
                 p.description ? `"${p.description.slice(0, 40)}"` :
                 p.plan ? `"${p.plan.slice(0, 40)}" cost=$${p.cost} eta=${p.etaSec}s` :
                 p.proposalId ? `proposal=${p.proposalId}` :
                 p.leadId ? `lead=${p.leadId}${p.score !== undefined ? ` score=${p.score}` : ""}` :
                 p.dispatchId ? `dispatch=${p.dispatchId}` : "";
  const reject = f.rejectedReason ? `  🔒 REJECTED — ${f.rejectedReason}` : "";
  console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(22)} ${e} ${f.payload.kind.padEnd(22)} ${detail}${reject}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Scenario
// ═══════════════════════════════════════════════════════════════════════════

for (const a of ["owner", "claude-lead-agent", "hunter-io-bot", "alice-human-sdr", "webhook-bridge"]) publicKeys.set(a, `pub-${a}`);

// DSL prelude — consistent across all examples
const auto = {
  skill(id: string, spec: { description?: string } = {}) { append("owner", { kind: "SkillRegistered", skillId: id, ...spec }); },
  agent(id: string, spec: { kind: "human" | "ai" | "script"; provides: string[] }) { append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides }); },
};

console.log("\n── lead-qualification: announce → propose → accept → graduate ──");
console.log("\nStage 0: declare skills + agents (DSL).\n");

auto.skill("qualify-lead", { description: "Score an inbound lead using BANT (budget, authority, need, timeline) and recommend next action" });

auto.agent("claude-lead-agent", { kind: "ai",     provides: ["qualify-lead"] });
auto.agent("hunter-io-bot",     { kind: "script", provides: ["qualify-lead"] });
auto.agent("alice-human-sdr",   { kind: "human",  provides: ["qualify-lead"] });

// Trust each agent to PROPOSE plans (not to auto-execute; that still needs owner approval initially)
append("owner", { kind: "TrustStatement", subject: "claude-lead-agent", scope: "provide:qualify-lead" });
append("owner", { kind: "TrustStatement", subject: "hunter-io-bot",     scope: "provide:qualify-lead" });
append("owner", { kind: "TrustStatement", subject: "alice-human-sdr",   scope: "provide:qualify-lead" });

// ── Stage 1: owner announces a need; agents propose; owner accepts one ──
console.log("\nStage 1: owner announces a need. Multiple agents propose.\n");

append("owner", { kind: "CapabilityRequested", description: "I need lead qualification for inbound signups" });

append("claude-lead-agent", { kind: "ProposalOffered", proposalId: "p1", plan: "BANT scoring via LLM on form fields", cost: 0.20, etaSec: 15 });
append("hunter-io-bot",     { kind: "ProposalOffered", proposalId: "p2", plan: "Email enrichment + domain rules + BANT",  cost: 0.50, etaSec: 20 });
append("alice-human-sdr",   { kind: "ProposalOffered", proposalId: "p3", plan: "Manual BANT review by me",                 cost: 5.00, etaSec: 86400 });

append("owner", { kind: "ProposalAccepted", proposalId: "p1", chose: "claude-lead-agent" });

// ── Stage 2: six leads arrive. First 3 need owner approval; 4-6 auto-confirm after graduation ──

async function processLead(leadId: string, data: { email: string; company: string; role: string }) {
  append("webhook-bridge", { kind: "LeadReceived", leadId, ...data });
  // Dispatch the qualify-lead skill
  const dispatchId = `d-${leadId}`;
  append("claude-lead-agent", { kind: "DispatchProposed", dispatchId, skillId: "qualify-lead", payload: data });

  // Graduation check: does claude-lead-agent have enough track record to skip approval?
  const graduated = isGraduated("claude-lead-agent", "qualify-lead");

  if (!graduated) {
    append("owner", { kind: "DispatchApproved", dispatchId });
  }
  // Either graduated → or approved → proceed
  append("claude-lead-agent", { kind: "DispatchClaimed", dispatchId, byAgent: "claude-lead-agent" });
  // Simulated BANT score — deterministic pseudo-score for demo
  const score = 30 + (data.role === "CEO" ? 40 : data.role === "VP" ? 30 : 10) + (data.company.length * 2);
  append("claude-lead-agent", { kind: "DispatchConfirmed", dispatchId, skillId: "qualify-lead", byAgent: "claude-lead-agent", score, nextAction: score > 70 ? "book-call" : "nurture-sequence", graduatedPath: graduated });
  await new Promise(r => setTimeout(r, 10));
}

console.log("\nStage 2: six leads arrive. Watch the graduation moment between runs 3 and 4.\n");

const leads = [
  { leadId: "L001", email: "ceo@acme.com",      company: "Acme",      role: "CEO" },
  { leadId: "L002", email: "vp@beta.co",        company: "Beta",      role: "VP" },
  { leadId: "L003", email: "analyst@gamma.io",  company: "Gamma",     role: "Analyst" },
  { leadId: "L004", email: "ceo@delta.ai",      company: "Delta",     role: "CEO" },
  { leadId: "L005", email: "lead@epsilon.com",  company: "Epsilon",   role: "Lead" },
  { leadId: "L006", email: "founder@zeta.xyz",  company: "Zeta",      role: "Founder" },
];

for (let i = 0; i < leads.length; i++) {
  console.log(`\n── lead ${i + 1}/${leads.length}: ${leads[i].email} ──\n`);
  await processLead(leads[i].leadId, leads[i]);
}

await new Promise(r => setTimeout(r, 50));

// ── Summary ──
const confirmed = log.filter(f => f.payload.kind === "DispatchConfirmed" && !f.rejectedReason);
const approvals = log.filter(f => f.payload.kind === "DispatchApproved" && !f.rejectedReason);
const graduatedRuns = confirmed.filter(f => f.payload.graduatedPath);

console.log(`\n── Summary ──`);
console.log(`   6 leads qualified by claude-lead-agent.`);
console.log(`   First ${GRADUATION_THRESHOLD} required owner approval: ${approvals.length} approvals signed.`);
console.log(`   After ${GRADUATION_THRESHOLD} successful runs, skill graduated — subsequent runs confirm without approval.`);
console.log(`   Dispatches via graduated path: ${graduatedRuns.length} / ${confirmed.length}`);
console.log(`\n   The skill definition never changed. Only who fulfilled it, and whether owner had to approve each run, changed.`);
console.log(`   This is progressive automation expressed as a reducer rule over the log.`);
