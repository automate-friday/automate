// business-workflows/script-fallback-chain.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Pattern — fallback chain: script → AI → human, recover to script on fix
// ═══════════════════════════════════════════════════════════════════════════
//
// Derived from BDD Story 2 ("The script breaks, the system adapts").
//
// One skill (`generate-report`) has THREE registered providers: a
// deterministic script, a Claude AI agent, and a human. The script is
// preferred (cheapest, fastest); AI is the fallback; human is the last
// resort. When the script's precondition fails, the runtime tries the
// next provider. When the root cause is fixed, subsequent dispatches go
// back to the cheapest provider — no config change needed.
//
// Run: bun business-workflows/script-fallback-chain.ts

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
  SkillRegistered: "📘", AgentOffered: "🤝", SourceFileChanged: "📂",
  DispatchProposed: "📮", DispatchClaimed: "🙋", DispatchFailed: "❌",
  DispatchConfirmed: "🟢", FallbackInvoked: "⤵️ ",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const p = f.payload;
  const detail = p.skillId ? `skill=${p.skillId}${p.source ? " source=" + p.source : ""}${p.reason ? " reason=" + p.reason : ""}` :
                 p.agentId ? `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]` :
                 p.present !== undefined ? `present=${p.present}` :
                 p.from ? `${p.from} → ${p.to}` : "";
  console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(20)} ${e} ${f.payload.kind.padEnd(20)} ${detail}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Scenario — three providers for one skill, runtime picks cheapest available
// ═══════════════════════════════════════════════════════════════════════════

for (const a of ["owner", "filesystem-watcher", "script-reporter", "claude-reporter", "alice-human"]) publicKeys.set(a, `pub-${a}`);

const auto = {
  skill(id: string, spec: { description?: string } = {}) { append("owner", { kind: "SkillRegistered", skillId: id, ...spec }); },
  agent(id: string, spec: { kind: "human" | "ai" | "script"; provides: string[] }) { append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides }); },
};

console.log("\n── script-fallback-chain: same skill, three providers, runtime prefers cheapest available ──");
console.log("\nStage 0: declare skills + agents. Cost ranking: script > ai > human.\n");

auto.skill("generate-report", { description: "Generate a weekly summary report from source.md" });

auto.agent("script-reporter",  { kind: "script", provides: ["generate-report"] });
auto.agent("claude-reporter",  { kind: "ai",     provides: ["generate-report"] });
auto.agent("alice-human",      { kind: "human",  provides: ["generate-report"] });

// Simulated world state
let sourceFileExists = true;   // starts present; gets deleted; gets restored
let sourceFileValid = true;    // starts valid; gets corrupted; gets fixed

// Providers' own "can I do this?" preconditions + fulfillment
function scriptPrecondition(): { ok: boolean; reason?: string } {
  if (!sourceFileExists) return { ok: false, reason: "source-file-not-found" };
  if (!sourceFileValid) return { ok: false, reason: "source-file-unparseable" };
  return { ok: true };
}
function aiPrecondition(): { ok: boolean; reason?: string } {
  if (!sourceFileExists) return { ok: false, reason: "source-file-not-found" };  // AI can handle corrupt but not missing
  return { ok: true };
}

async function dispatchGenerateReport(scenario: string) {
  console.log(`\n── Scenario: ${scenario} ──\n`);
  const dispatchId = `d-${log.length + 1}`;
  append("owner", { kind: "DispatchProposed", dispatchId, skillId: "generate-report" });

  // Runtime tries providers in cost order: script → ai → human
  const providers: Array<{ id: string; kind: string; tryIt: () => { ok: boolean; reason?: string } }> = [
    { id: "script-reporter", kind: "script", tryIt: scriptPrecondition },
    { id: "claude-reporter", kind: "ai",     tryIt: aiPrecondition },
    { id: "alice-human",     kind: "human",  tryIt: () => ({ ok: true }) },  // human can always do it
  ];

  for (const p of providers) {
    const check = p.tryIt();
    if (!check.ok) {
      append(p.id, { kind: "DispatchFailed", dispatchId, skillId: "generate-report", source: p.kind, reason: check.reason });
      append("runtime", { kind: "FallbackInvoked", dispatchId, from: p.kind, to: providers[providers.indexOf(p) + 1]?.kind ?? "none" });
      continue;
    }
    append(p.id, { kind: "DispatchClaimed", dispatchId, byAgent: p.id });
    append(p.id, { kind: "DispatchConfirmed", dispatchId, skillId: "generate-report", source: p.kind, byAgent: p.id });
    return;
  }
  append("runtime", { kind: "DispatchFailed", dispatchId, skillId: "generate-report", reason: "all-providers-exhausted" });
}

publicKeys.set("runtime", "pub-runtime");

// Scenario 1: everything works. Script handles it.
await dispatchGenerateReport("source.md present and valid — script handles it");

// Scenario 2: file becomes corrupt. Script fails → AI handles it.
sourceFileValid = false;
append("filesystem-watcher", { kind: "SourceFileChanged", present: true, valid: false });
await dispatchGenerateReport("source.md corrupted — script fails, AI fallback handles it");

// Scenario 3: file is deleted entirely. Script + AI fail → human handles.
sourceFileExists = false;
append("filesystem-watcher", { kind: "SourceFileChanged", present: false });
await dispatchGenerateReport("source.md deleted — script + AI fail, human fallback handles it");

// Scenario 4: file restored. System automatically reverts to script.
sourceFileExists = true;
sourceFileValid = true;
append("filesystem-watcher", { kind: "SourceFileChanged", present: true, valid: true });
await dispatchGenerateReport("source.md restored — back to script automatically, no config change");

await new Promise(r => setTimeout(r, 30));

// ── Summary ──
const confirms = log.filter(f => f.payload.kind === "DispatchConfirmed" && !f.rejectedReason);
const bySource: Record<string, number> = {};
for (const c of confirms) bySource[c.payload.source] = (bySource[c.payload.source] ?? 0) + 1;

console.log(`\n── Summary ──`);
console.log(`   4 dispatches of generate-report.`);
console.log(`   Handled by script: ${bySource.script ?? 0}, by AI: ${bySource.ai ?? 0}, by human: ${bySource.human ?? 0}`);
console.log(`\n   Same skill. Three providers. The runtime picked the cheapest available each time.`);
console.log(`   When the root cause was fixed, the system returned to the cheapest provider automatically.`);
console.log(`   No config changes. No manual failover. The graduation-back-to-cheap is as automatic as the escalation-to-expensive.`);
