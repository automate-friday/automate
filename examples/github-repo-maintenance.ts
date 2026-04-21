// examples/github-repo-maintenance.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Pattern — scheduled recurring work with failure escalation
// ═══════════════════════════════════════════════════════════════════════════
//
// Every tick (daily in prod; here, every ~20ms), a scheduled job checks a
// GitHub repo's state. If dependencies are stale, it proposes an update PR.
// If the PR creation fails three times, it escalates to the owner.
//
// The scheduler itself is a signed agent. Its ticks are facts. Anyone auditing
// can see "was this check run today? did it find anything? did the upgrade
// actually land?" without touching a CI dashboard.
//
// Six ticks in this demo: days 1-3 clean, day 4 detects stale deps and a PR
// is proposed/merged, days 5-6 clean again. On day 7, PR creation fails and
// the failure escalates after 3 retries.
//
// Run: bun examples/github-repo-maintenance.ts

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
  // Only trusted schedulers may emit ticks
  if (p.kind === "ScheduledTick" && !hasTrust(f.signer, "scheduler-authority"))
    return { ok: false, reason: "not-authorized-to-schedule" };
  return { ok: true };
}

const EMOJI: Record<string, string> = {
  SkillRegistered: "📘", AgentOffered: "🤝", TrustStatement: "📜",
  ScheduledTick: "⏰", RepoScanned: "🔍", StaleDependenciesDetected: "📦",
  DispatchProposed: "📮", DispatchClaimed: "🙋", PRCreated: "🔧",
  PRMerged: "✅", DispatchConfirmed: "🟢", DispatchFailed: "❌",
  Escalation: "🚨", Notification: "📣",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const p = f.payload;
  const detail = p.skillId ? `skill=${p.skillId}` :
                 p.agentId ? `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]` :
                 p.subject ? `${p.subject} / ${p.scope}` :
                 p.day ? `day=${p.day}` :
                 p.repo ? `repo=${p.repo}${p.status ? " status=" + p.status : ""}` :
                 p.stale ? `stale=[${p.stale.join(",")}]` :
                 p.prNumber ? `#${p.prNumber} ${p.title ?? ""}` :
                 p.dispatchId ? `id=${p.dispatchId}` :
                 p.reason ? `reason=${p.reason}` :
                 p.to ? `to=${p.to}: ${(p.message ?? "").slice(0, 60)}` : "";
  const reject = f.rejectedReason ? `  🔒 REJECTED — ${f.rejectedReason}` : "";
  console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(20)} ${e} ${f.payload.kind.padEnd(24)} ${detail}${reject}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Scenario
// ═══════════════════════════════════════════════════════════════════════════

for (const a of ["owner", "cron-scheduler", "claude-maintainer", "github-bridge"]) publicKeys.set(a, `pub-${a}`);

const auto = {
  skill(id: string, spec: { description?: string } = {}) { append("owner", { kind: "SkillRegistered", skillId: id, ...spec }); },
  agent(id: string, spec: { kind: "human" | "ai" | "script"; provides: string[] }) { append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides }); },
};

console.log("\n── github-repo-maintenance: scheduled check, auto-PR on drift, escalation on failure ──");
console.log("\nStage 0: declare skills + agents (DSL).\n");

auto.skill("scan-repo-dependencies", { description: "Read package.json + lockfile, identify outdated deps beyond 30 days" });
auto.skill("propose-upgrade-pr",     { description: "Open a PR upgrading identified stale deps; include CI-passes check" });

auto.agent("cron-scheduler",   { kind: "script", provides: [] });
auto.agent("claude-maintainer",{ kind: "ai",     provides: ["scan-repo-dependencies", "propose-upgrade-pr"] });
auto.agent("github-bridge",    { kind: "script", provides: [] });

append("owner", { kind: "TrustStatement", subject: "cron-scheduler",    scope: "scheduler-authority" });
append("owner", { kind: "TrustStatement", subject: "claude-maintainer", scope: "provide:scan-repo-dependencies" });
append("owner", { kind: "TrustStatement", subject: "claude-maintainer", scope: "provide:propose-upgrade-pr" });

// Simulated world state — in prod, this would come from actual API calls.
// For pedagogy: staleness and outages are precomputed per day.
const DAYS_WITH_STALE_DEPS = new Set([4, 7]);
const DAYS_WITH_GITHUB_OUTAGE = new Set([4]);
const FAILURE_ESCALATION_THRESHOLD = 3;
let consecutivePRFailures = 0;

// Subscriber: on a ScheduledTick, run the maintainer scan
subs.push(async (f) => {
  if (f.payload.kind !== "ScheduledTick" || f.rejectedReason) return;
  queueMicrotask(async () => {
    const day = f.payload.day;
    const isStale = DAYS_WITH_STALE_DEPS.has(day);
    append("claude-maintainer", { kind: "RepoScanned", repo: "automate-friday/protocol", status: isStale ? "stale" : "fresh" });
    if (!isStale) return;

    const stale = ["lodash@4.17.20 → 4.17.21", "typescript@5.3.0 → 5.4.0"];
    append("claude-maintainer", { kind: "StaleDependenciesDetected", repo: "automate-friday/protocol", stale });
    const dispatchId = `d-pr-day${day}-attempt${(f.payload.attempt ?? 1)}`;
    append("claude-maintainer", { kind: "DispatchProposed", dispatchId, skillId: "propose-upgrade-pr", payload: { stale } });

    if (DAYS_WITH_GITHUB_OUTAGE.has(day)) {
      consecutivePRFailures++;
      append("github-bridge", { kind: "DispatchFailed", dispatchId, reason: "github-api-503-unavailable" });
      if (consecutivePRFailures >= FAILURE_ESCALATION_THRESHOLD) {
        append("github-bridge", { kind: "Escalation", to: "owner", reason: `propose-upgrade-pr failed ${consecutivePRFailures} consecutive times`, message: "check GitHub API status + rotate token if needed" });
      }
      return;
    }
    // Success path
    consecutivePRFailures = 0;
    const prNumber = 100 + day;
    append("github-bridge", { kind: "DispatchClaimed", dispatchId, byAgent: "github-bridge" });
    append("github-bridge", { kind: "PRCreated", prNumber, title: `chore(deps): upgrade ${stale.length} dependencies`, dispatchId });
    append("github-bridge", { kind: "PRMerged", prNumber });
    append("github-bridge", { kind: "DispatchConfirmed", dispatchId });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Run — simulate 7 daily ticks. Day 4 triggers a real upgrade. Day 7 fails.
// ═══════════════════════════════════════════════════════════════════════════

async function simulateRetry(day: number) {
  // On day 7, the job fails. To show escalation at threshold 3, we retry
  // immediately (in prod, retries would happen on cron schedule).
  for (let attempt = 0; attempt < FAILURE_ESCALATION_THRESHOLD; attempt++) {
    append("cron-scheduler", { kind: "ScheduledTick", day, attempt: attempt + 1 });
    await new Promise(r => setTimeout(r, 15));
  }
}

console.log("\nStage 1: seven daily ticks.\n");

for (let day = 1; day <= 7; day++) {
  console.log(`\n── Day ${day} ──\n`);
  if (day === 4) {
    // GitHub API outage — retries exhausted, escalation fires
    await simulateRetry(day);
  } else {
    append("cron-scheduler", { kind: "ScheduledTick", day });
    await new Promise(r => setTimeout(r, 20));
  }
}

await new Promise(r => setTimeout(r, 30));

// ── Summary ──
const prs = log.filter(f => f.payload.kind === "PRMerged" && !f.rejectedReason);
const escalations = log.filter(f => f.payload.kind === "Escalation" && !f.rejectedReason);
const stale = log.filter(f => f.payload.kind === "StaleDependenciesDetected" && !f.rejectedReason);

console.log(`\n── Summary ──`);
console.log(`   7 scheduled ticks.`);
console.log(`   Stale-dependency detections: ${stale.length}`);
console.log(`   PRs merged: ${prs.length} (each runs CI, auto-merges on green)`);
console.log(`   Escalations to owner: ${escalations.length} (failure threshold = ${FAILURE_ESCALATION_THRESHOLD})`);
console.log(`\n   The scheduler is a signed agent; its ticks are facts.`);
console.log(`   Every "did maintenance run today?" question is answerable by projecting the log.`);
console.log(`   Failure escalation is automatic — no separate monitoring infrastructure needed.`);
