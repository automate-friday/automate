// business-workflows/decomposed-engine.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Pattern — decomposition via projection (React-style)
// ═══════════════════════════════════════════════════════════════════════════
//
// Derived from BDD Story 5 ("Decompose like a React component").
//
// A `client-onboarding` workflow used to be a monolithic skill. Now it's
// decomposed into four sub-skills that can be fulfilled at DIFFERENT
// automation levels by DIFFERENT agents. The parent's job is just to read
// each child's confirmation from the log and decide when the whole thing
// is done — same shape as a React parent reading children's props.
//
//   welcome-email      → script (deterministic template)
//   crm-entry          → ai (Claude pulls from context)
//   schedule-kickoff   → human (needs real-time availability check)
//   assign-agents      → ai (Claude maps client profile to team roster)
//
// Parent engine completes client-onboarding when all four children confirm.
// Any child can be swapped for a different executor without touching others.
//
// Run: bun business-workflows/decomposed-engine.ts

type Fact = { id: string; lamport: number; signer: string; prevHash: string; signature: string; payload: any; rejectedReason?: string };
const log: Fact[] = [];
const subs: Array<(f: Fact) => void> = [];
let nextLamport = 1;
let prevHash = "genesis";
const publicKeys = new Map<string, string>();

const sign = (s: string, p: any) => `sig(${s}:${JSON.stringify(p).slice(0, 20)})`;
const verify = (f: Fact) => f.signature === sign(f.signer, f.payload) && publicKeys.has(f.signer);

function append(signer: string, payload: any): Fact {
  const f: Fact = { id: `f${log.length + 1}`, lamport: nextLamport++, signer, prevHash, signature: sign(signer, payload), payload };
  if (!verify(f)) f.rejectedReason = "bad-signature";
  log.push(f); prevHash = f.id;
  for (const cb of subs) queueMicrotask(() => cb(f));
  return f;
}

const EMOJI: Record<string, string> = {
  SkillRegistered: "📘", AgentOffered: "🤝", ClientOnboardingStarted: "🆕",
  DispatchProposed: "📮", DispatchClaimed: "🙋", DispatchConfirmed: "🟢",
  OnboardingComplete: "🎉", ChildProjection: "👁️ ", HumanApprovalNeeded: "✋",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const p = f.payload;
  const detail = p.skillId ? `skill=${p.skillId}${p.level ? " @" + p.level : ""}` :
                 p.agentId ? `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]` :
                 p.clientId ? `client=${p.clientId}${p.stage ? " stage=" + p.stage : ""}` :
                 p.dispatchId ? `id=${p.dispatchId}` :
                 p.childState ? JSON.stringify(p.childState) : "";
  console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(22)} ${e} ${f.payload.kind.padEnd(24)} ${detail}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Scenario
// ═══════════════════════════════════════════════════════════════════════════

for (const a of ["owner", "onboarding-parent", "email-script", "claude-crm", "bob-scheduler", "claude-matchmaker"]) publicKeys.set(a, `pub-${a}`);

const auto = {
  skill(id: string, spec: { description?: string } = {}) { append("owner", { kind: "SkillRegistered", skillId: id, ...spec }); },
  agent(id: string, spec: { kind: "human" | "ai" | "script"; provides: string[] }) { append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides }); },
};

console.log("\n── decomposed-engine: client-onboarding as 4 composable children at different automation levels ──");
console.log("\nStage 0: declare skills + agents. Each child runs at its own level.\n");

auto.skill("client-onboarding",  { description: "Orchestrator: complete when all four children confirm" });
auto.skill("welcome-email",      { description: "Send templated welcome email (deterministic)" });
auto.skill("crm-entry",          { description: "Create Hubspot contact with enriched data (AI)" });
auto.skill("schedule-kickoff",   { description: "Find a mutually-available 60-min slot next week (human)" });
auto.skill("assign-agents",      { description: "Match client profile to an internal team roster (AI)" });

auto.agent("email-script",      { kind: "script", provides: ["welcome-email"] });
auto.agent("claude-crm",        { kind: "ai",     provides: ["crm-entry"] });
auto.agent("bob-scheduler",     { kind: "human",  provides: ["schedule-kickoff"] });
auto.agent("claude-matchmaker", { kind: "ai",     provides: ["assign-agents"] });
auto.agent("onboarding-parent", { kind: "script", provides: ["client-onboarding"] });

// ═══════════════════════════════════════════════════════════════════════════
// Parent's job is ONLY to read children's state from the log.
// It never calls the children directly; it projects the log to see them.
// ═══════════════════════════════════════════════════════════════════════════

type ChildState = { "welcome-email"?: "done"; "crm-entry"?: "done"; "schedule-kickoff"?: "done"; "assign-agents"?: "done" };

function projectChildrenFor(clientId: string): ChildState {
  const out: ChildState = {};
  for (const f of log) {
    if (f.payload.kind !== "DispatchConfirmed" || f.rejectedReason) continue;
    if (f.payload.clientId !== clientId) continue;
    if (["welcome-email", "crm-entry", "schedule-kickoff", "assign-agents"].includes(f.payload.skillId)) {
      (out as any)[f.payload.skillId] = "done";
    }
  }
  return out;
}

subs.push((f) => {
  if (f.payload.kind !== "DispatchConfirmed" || f.rejectedReason) return;
  const clientId = f.payload.clientId;
  if (!clientId) return;
  // Parent watches for child completions and decides when the whole is done
  queueMicrotask(() => {
    const children = projectChildrenFor(clientId);
    const allDone = children["welcome-email"] === "done" && children["crm-entry"] === "done" && children["schedule-kickoff"] === "done" && children["assign-agents"] === "done";
    append("onboarding-parent", { kind: "ChildProjection", clientId, childState: children });
    if (allDone && !log.some(x => x.payload.kind === "OnboardingComplete" && x.payload.clientId === clientId)) {
      append("onboarding-parent", { kind: "OnboardingComplete", clientId });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Simulate onboarding a new client
// ═══════════════════════════════════════════════════════════════════════════

console.log("\nStage 1: new client arrives. Parent dispatches four children, each at its own level.\n");

const clientId = "client-acme-42";
append("owner", { kind: "ClientOnboardingStarted", clientId, name: "Acme Corp" });

// Parent dispatches four children (in parallel; each handled by its preferred agent)
append("onboarding-parent", { kind: "DispatchProposed", dispatchId: "d-email",    skillId: "welcome-email",    clientId });
append("onboarding-parent", { kind: "DispatchProposed", dispatchId: "d-crm",      skillId: "crm-entry",        clientId });
append("onboarding-parent", { kind: "DispatchProposed", dispatchId: "d-kickoff",  skillId: "schedule-kickoff", clientId });
append("onboarding-parent", { kind: "DispatchProposed", dispatchId: "d-agents",   skillId: "assign-agents",    clientId });

// Each child fulfills at its own pace / automation level
await new Promise(r => setTimeout(r, 10));

// welcome-email: fastest (script)
append("email-script", { kind: "DispatchClaimed", dispatchId: "d-email", byAgent: "email-script" });
append("email-script", { kind: "DispatchConfirmed", dispatchId: "d-email", skillId: "welcome-email", clientId, level: "script" });

// assign-agents: ai, fast
append("claude-matchmaker", { kind: "DispatchClaimed", dispatchId: "d-agents", byAgent: "claude-matchmaker" });
await new Promise(r => setTimeout(r, 10));
append("claude-matchmaker", { kind: "DispatchConfirmed", dispatchId: "d-agents", skillId: "assign-agents", clientId, level: "ai" });

// crm-entry: ai, fast
append("claude-crm", { kind: "DispatchClaimed", dispatchId: "d-crm", byAgent: "claude-crm" });
await new Promise(r => setTimeout(r, 10));
append("claude-crm", { kind: "DispatchConfirmed", dispatchId: "d-crm", skillId: "crm-entry", clientId, level: "ai" });

// schedule-kickoff: human, slower — requires Bob to click in his calendar
append("bob-scheduler", { kind: "HumanApprovalNeeded", dispatchId: "d-kickoff", to: "bob-scheduler" });
await new Promise(r => setTimeout(r, 30));  // bob takes a bit longer
append("bob-scheduler", { kind: "DispatchClaimed", dispatchId: "d-kickoff", byAgent: "bob-scheduler" });
append("bob-scheduler", { kind: "DispatchConfirmed", dispatchId: "d-kickoff", skillId: "schedule-kickoff", clientId, level: "human" });

await new Promise(r => setTimeout(r, 40));

// ── Summary ──
const completed = log.filter(f => f.payload.kind === "OnboardingComplete" && !f.rejectedReason);
const childConfirms = log.filter(f => f.payload.kind === "DispatchConfirmed" && ["welcome-email", "crm-entry", "schedule-kickoff", "assign-agents"].includes(f.payload.skillId) && !f.rejectedReason);
const levels = new Set(childConfirms.map(f => f.payload.level));

console.log(`\n── Summary ──`);
console.log(`   Client onboarding for ${clientId}: ${completed.length > 0 ? "✅ COMPLETE" : "❌ incomplete"}`);
console.log(`   Children fulfilled: ${childConfirms.length}/4`);
console.log(`   Distinct automation levels used: ${[...levels].join(", ")}`);
console.log(`\n   The parent never called the children directly.`);
console.log(`   It only read their 'done' state from the log and decided when the whole thing was complete.`);
console.log(`   Swap any child's provider (script→ai, ai→human) and the parent still works — same interface.`);
console.log(`   This is React's component model applied to business workflows.`);
