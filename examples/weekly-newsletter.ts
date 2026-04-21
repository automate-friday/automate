// examples/weekly-newsletter.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Pattern — recurring content work with evolving approval gates
// ═══════════════════════════════════════════════════════════════════════════
//
// Every week, a client newsletter must ship. A chain of skills does the work:
//   collect-sources → draft-newsletter → review-tone → send-campaign
//
// Each step has its own approval profile:
//   collect-sources   — fully automated (deterministic script)
//   draft-newsletter  — AI; first 3 weeks require owner approval, then graduates
//   review-tone       — AI validator that issues a tone-score artifact; must be >= 80
//   send-campaign     — ALWAYS requires owner approval (sending to real subscribers)
//
// This is the most nuanced progressive-automation story: different steps of
// one workflow graduate on different timelines, and the highest-stakes step
// (send) stays human-gated forever.
//
// Four weeks in this demo: watch which dispatches require human clicks
// shift between weeks as trust in the drafting agent accrues.
//
// Run: bun examples/weekly-newsletter.ts

type Fact = { id: string; lamport: number; signer: string; prevHash: string; signature: string; payload: any; rejectedReason?: string };
const log: Fact[] = [];
const subs: Array<(f: Fact) => void> = [];
let nextLamport = 1;
let prevHash = "genesis";
const publicKeys = new Map<string, string>();
const trustedScopes = new Map<string, Set<string>>();
const sign = (s: string, p: any) => `sig(${s}:${JSON.stringify(p).slice(0, 20)})`;
const verify = (f: Fact) => f.signature === sign(f.signer, f.payload) && publicKeys.has(f.signer);
const hasTrust = (s: string, sc: string) => !!trustedScopes.get(s)?.has(sc);

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
  if (p.kind === "DispatchApproved" && f.signer !== "owner") return { ok: false, reason: "only-owner-may-approve" };
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-skill graduation rules
// ═══════════════════════════════════════════════════════════════════════════

const DRAFT_GRADUATION_THRESHOLD = 3;  // after 3 approved drafts, auto-approve
// send-campaign NEVER graduates; always human-gated

function isDraftGraduated(agent: string): boolean {
  const confirmed = log.filter(f =>
    f.payload.kind === "DispatchConfirmed" && f.payload.skillId === "draft-newsletter" && f.payload.byAgent === agent && !f.rejectedReason
  ).length;
  return confirmed >= DRAFT_GRADUATION_THRESHOLD;
}

// ═══════════════════════════════════════════════════════════════════════════
// Pretty printer
// ═══════════════════════════════════════════════════════════════════════════

const EMOJI: Record<string, string> = {
  SkillRegistered: "📘", AgentOffered: "🤝", TrustStatement: "📜",
  WeekStart: "📅", SourcesCollected: "📚", DraftProduced: "✍️ ",
  ToneScored: "🎭", DispatchProposed: "📮", DispatchApproved: "✅",
  DispatchClaimed: "🙋", DispatchConfirmed: "🟢", DispatchBlocked: "🔒",
  CampaignSent: "📬", Notification: "📣",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const p = f.payload;
  const detail = p.skillId ? `skill=${p.skillId}${p.graduatedPath ? " (graduated)" : p.approvalRequired ? " (awaiting approval)" : ""}` :
                 p.agentId ? `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]` :
                 p.subject ? `${p.subject} / ${p.scope}` :
                 p.week ? `week=${p.week}${p.title ? " " + p.title : ""}` :
                 p.score !== undefined ? `score=${p.score}/100${p.verdict ? " " + p.verdict : ""}` :
                 p.sources ? `sources=${p.sources.length}` :
                 p.subscribers ? `subscribers=${p.subscribers}` :
                 p.dispatchId ? `id=${p.dispatchId}` :
                 p.to ? `to=${p.to}` : "";
  const reject = f.rejectedReason ? `  🔒 REJECTED — ${f.rejectedReason}` : "";
  console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(20)} ${e} ${f.payload.kind.padEnd(20)} ${detail}${reject}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Scenario
// ═══════════════════════════════════════════════════════════════════════════

for (const a of ["owner", "cron-scheduler", "source-collector", "claude-drafter", "tone-judge", "mailchimp-bridge"]) publicKeys.set(a, `pub-${a}`);

const auto = {
  skill(id: string, spec: { description?: string } = {}) { append("owner", { kind: "SkillRegistered", skillId: id, ...spec }); },
  agent(id: string, spec: { kind: "human" | "ai" | "script"; provides: string[] }) { append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides }); },
};

console.log("\n── weekly-newsletter: four-step workflow with per-step approval profiles ──");
console.log("\nStage 0: declare skills + agents (DSL).\n");

auto.skill("collect-sources",   { description: "Gather client's published content from the past week" });
auto.skill("draft-newsletter",  { description: "Generate a markdown newsletter body from source list" });
auto.skill("review-tone",       { description: "Score tone + coherence of a draft on a 0-100 scale; judge signs artifact" });
auto.skill("send-campaign",     { description: "Submit the approved draft to Mailchimp for delivery" });

auto.agent("source-collector",  { kind: "script", provides: ["collect-sources"] });
auto.agent("claude-drafter",    { kind: "ai",     provides: ["draft-newsletter"] });
auto.agent("tone-judge",        { kind: "ai",     provides: ["review-tone"] });
auto.agent("mailchimp-bridge",  { kind: "script", provides: ["send-campaign"] });

append("owner", { kind: "TrustStatement", subject: "source-collector",  scope: "provide:collect-sources" });
append("owner", { kind: "TrustStatement", subject: "claude-drafter",    scope: "provide:draft-newsletter" });
append("owner", { kind: "TrustStatement", subject: "tone-judge",        scope: "provide:review-tone" });
append("owner", { kind: "TrustStatement", subject: "mailchimp-bridge",  scope: "provide:send-campaign" });

// ═══════════════════════════════════════════════════════════════════════════
// Four weeks of the workflow
// ═══════════════════════════════════════════════════════════════════════════

async function runWeek(weekNum: number) {
  console.log(`\n── Week ${weekNum} ──\n`);
  append("cron-scheduler", { kind: "WeekStart", week: weekNum });

  // Step 1: collect-sources (always automatic)
  const sources = [`Post ${weekNum}.1`, `Post ${weekNum}.2`, `Post ${weekNum}.3`];
  const d1 = `d-sources-w${weekNum}`;
  append("source-collector", { kind: "DispatchProposed", dispatchId: d1, skillId: "collect-sources" });
  append("source-collector", { kind: "DispatchClaimed", dispatchId: d1, byAgent: "source-collector" });
  append("source-collector", { kind: "SourcesCollected", week: weekNum, sources });
  append("source-collector", { kind: "DispatchConfirmed", dispatchId: d1, skillId: "collect-sources", byAgent: "source-collector" });

  // Step 2: draft-newsletter (graduates after 3 successful weeks)
  const d2 = `d-draft-w${weekNum}`;
  const draftGraduated = isDraftGraduated("claude-drafter");
  append("claude-drafter", { kind: "DispatchProposed", dispatchId: d2, skillId: "draft-newsletter", graduatedPath: draftGraduated, approvalRequired: !draftGraduated });
  if (!draftGraduated) {
    append("owner", { kind: "DispatchApproved", dispatchId: d2 });
  }
  append("claude-drafter", { kind: "DispatchClaimed", dispatchId: d2, byAgent: "claude-drafter" });
  append("claude-drafter", { kind: "DraftProduced", week: weekNum, title: `What's new — Week ${weekNum}`, words: 520 });
  append("claude-drafter", { kind: "DispatchConfirmed", dispatchId: d2, skillId: "draft-newsletter", byAgent: "claude-drafter" });

  // Step 3: review-tone (always automatic AI judge)
  const d3 = `d-tone-w${weekNum}`;
  const score = 82 + (weekNum % 3) * 5;  // simulated score
  append("tone-judge", { kind: "DispatchProposed", dispatchId: d3, skillId: "review-tone" });
  append("tone-judge", { kind: "DispatchClaimed", dispatchId: d3, byAgent: "tone-judge" });
  append("tone-judge", { kind: "ToneScored", week: weekNum, score, verdict: score >= 80 ? "pass" : "revise" });
  if (score < 80) {
    append("tone-judge", { kind: "DispatchBlocked", dispatchId: d3, reason: "tone-score-below-threshold" });
    return; // workflow stops; would go back to draft step
  }
  append("tone-judge", { kind: "DispatchConfirmed", dispatchId: d3, skillId: "review-tone", byAgent: "tone-judge" });

  // Step 4: send-campaign (ALWAYS human-gated — money/reputation on the line)
  const d4 = `d-send-w${weekNum}`;
  append("mailchimp-bridge", { kind: "DispatchProposed", dispatchId: d4, skillId: "send-campaign", approvalRequired: true });
  append("owner", { kind: "DispatchApproved", dispatchId: d4 });
  append("mailchimp-bridge", { kind: "DispatchClaimed", dispatchId: d4, byAgent: "mailchimp-bridge" });
  append("mailchimp-bridge", { kind: "CampaignSent", week: weekNum, subscribers: 2847 });
  append("mailchimp-bridge", { kind: "DispatchConfirmed", dispatchId: d4, skillId: "send-campaign", byAgent: "mailchimp-bridge" });

  await new Promise(r => setTimeout(r, 20));
}

console.log("\nStage 1: four weeks of the newsletter pipeline.\n");

for (let week = 1; week <= 4; week++) {
  await runWeek(week);
}

await new Promise(r => setTimeout(r, 30));

// ── Summary ──
const drafts = log.filter(f => f.payload.kind === "DispatchConfirmed" && f.payload.skillId === "draft-newsletter" && !f.rejectedReason);
const sends = log.filter(f => f.payload.kind === "CampaignSent" && !f.rejectedReason);
const approvals = log.filter(f => f.payload.kind === "DispatchApproved" && !f.rejectedReason);
const draftApprovals = approvals.filter(f => log.find(x => x.payload.kind === "DispatchProposed" && x.payload.dispatchId === f.payload.dispatchId && x.payload.skillId === "draft-newsletter"));
const sendApprovals = approvals.filter(f => log.find(x => x.payload.kind === "DispatchProposed" && x.payload.dispatchId === f.payload.dispatchId && x.payload.skillId === "send-campaign"));

console.log(`\n── Summary ──`);
console.log(`   4 weekly newsletters drafted and sent.`);
console.log(`   Owner approvals on drafts:       ${draftApprovals.length} (first ${DRAFT_GRADUATION_THRESHOLD} weeks; graduated week 4)`);
console.log(`   Owner approvals on sends:        ${sendApprovals.length} (every week — never graduates; money on the line)`);
console.log(`   Total human clicks over 4 weeks: ${approvals.length} (down from 8 if neither step graduated)`);
console.log(`\n   Each step of the workflow has its own approval profile.`);
console.log(`   Low-stakes steps (drafting) graduate; high-stakes steps (sending) stay gated.`);
console.log(`   The skill definitions never changed — only the gate configuration evolved.`);
