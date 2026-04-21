// examples/self-heal.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Purpose
// ═══════════════════════════════════════════════════════════════════════════
//
// Demonstrate self-healing as an emergent property of the substrate.
//
// The scenario — a classic fox-guarding-the-henhouse attack:
//   1. claude-coder provides TWO skills: write-code AND publish-to-git.
//      Structurally, they have both the temptation and the opportunity to
//      exfiltrate secrets by embedding them in code and publishing.
//
//   2. BEFORE anything bad happens, the owner signs three things:
//        (a) An Invariant:
//            "code artifacts containing secret-patterns must not advance to publish"
//        (b) A HealRule:
//            "on InvariantViolation: rotate affected secrets + revoke publish trust"
//        (c) TrustStatements for monitor and heal agents.
//
//   3. claude-coder tries the attack: uploads code with an embedded secret, then
//      dispatches publish-to-git.
//
//   4. security-monitor detects the invariant breach (pattern-match on the artifact
//      content) and appends a signed InvariantViolation fact.
//
//   5. heal-agent observes the violation and automatically dispatches:
//        - rotate-affected-secrets
//        - revoke-trust for claude-coder's publish-to-git
//
//   6. The leaked secret is still in the log forever (append-only) — but the new
//      secret is different, so the leak is worthless. Any future publish-to-git
//      dispatches from claude-coder are refused by the reducer.
//
// Run: bun examples/self-heal.ts

// ═══════════════════════════════════════════════════════════════════════════
// 1. Substrate (shared shape with other examples)
// ═══════════════════════════════════════════════════════════════════════════

type Fact = {
  id: string;
  lamport: number;
  signer: string;
  prevHash: string;
  signature: string;
  payload: any;
  rejectedReason?: string;
};

const log: Fact[] = [];
const subs: Array<(f: Fact) => void> = [];
let nextLamport = 1;
let prevHash = "genesis";

const publicKeys = new Map<string, string>();
const trustStatements: Array<{ subject: string; scope: string; active: boolean }> = [];
const trustedAgents = new Map<string, Set<string>>();  // subject -> set of scopes
const revokedTrust = new Map<string, Set<string>>();   // subject -> set of revoked scopes

function sign(signer: string, payload: any) { return `sig(${signer}:${JSON.stringify(payload).slice(0, 24)})`; }
function verifySignature(f: Fact) {
  return f.signature === sign(f.signer, f.payload) && publicKeys.has(f.signer);
}

function hasTrust(subject: string, scope: string): boolean {
  if (revokedTrust.get(subject)?.has(scope)) return false;
  return !!trustedAgents.get(subject)?.has(scope);
}

function append(signer: string, payload: any): Fact {
  const f: Fact = {
    id: `f${log.length + 1}`,
    lamport: nextLamport++,
    signer,
    prevHash,
    signature: sign(signer, payload),
    payload,
  };
  // Apply policy-agent side effects BEFORE running reducer so violations can be caught
  maybeRecordTrust(f);
  maybeRevokeTrust(f);
  const verdict = reducerCheck(f);
  if (!verdict.ok) f.rejectedReason = verdict.reason;
  log.push(f);
  prevHash = f.id;
  for (const cb of subs) queueMicrotask(() => cb(f));
  return f;
}

function maybeRecordTrust(f: Fact) {
  if (f.payload.kind !== "TrustStatement") return;
  if (f.signer !== "owner") return;  // only the owner may issue trust from genesis
  const { subject, scope } = f.payload;
  const s = trustedAgents.get(subject) ?? new Set();
  s.add(scope);
  trustedAgents.set(subject, s);
}

function maybeRevokeTrust(f: Fact) {
  if (f.payload.kind !== "TrustRevoked") return;
  // Revocation can come from owner OR from a trusted heal agent
  if (f.signer !== "owner" && !hasTrust(f.signer, "heal-authority")) return;
  const { subject, scope } = f.payload;
  const s = revokedTrust.get(subject) ?? new Set();
  s.add(scope);
  revokedTrust.set(subject, s);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Minimal reducer — just enough to demonstrate trust + invariants
// ═══════════════════════════════════════════════════════════════════════════

function reducerCheck(f: Fact): { ok: true } | { ok: false; reason: string } {
  if (!verifySignature(f)) return { ok: false, reason: "bad-signature" };

  const p = f.payload;

  // Dispatch proposals require: signer provides the skill AND has trust for it.
  if (p.kind === "DispatchProposed") {
    if (!hasTrust(f.signer, `provide:${p.skillId}`)) {
      return { ok: false, reason: `trust-not-granted-for-${p.skillId}` };
    }
    // Also check for active violation — invariant blocks advancement
    if (log.some(x =>
      x.payload.kind === "InvariantViolation"
      && x.payload.blockSkill === p.skillId
      && x.payload.offender === f.signer
      && !x.rejectedReason
    )) {
      return { ok: false, reason: "blocked-by-invariant-violation" };
    }
  }

  // InvariantViolation facts require signer holds monitor-authority trust
  if (p.kind === "InvariantViolation") {
    if (!hasTrust(f.signer, "monitor-authority")) {
      return { ok: false, reason: "not-authorized-to-detect-violations" };
    }
  }

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Scenario setup — all pre-declared, all signed by owner
// ═══════════════════════════════════════════════════════════════════════════

// Register agent public keys
for (const agent of ["owner", "claude-coder", "security-monitor", "heal-agent-v1"]) {
  publicKeys.set(agent, `pub-${agent}`);
}

// Pretty printer first so bootstrap is visible
const EMOJI: Record<string, string> = {
  SkillRegistered: "📘", AgentOffered: "🤝",
  TrustStatement: "📜", TrustRevoked: "🚫", Invariant: "🛡️ ", HealRule: "🩺",
  DispatchProposed: "📮", DispatchClaimed: "🙋", ArtifactUploaded: "🔨",
  InvariantViolation: "🚨", DispatchConfirmed: "🟢", Notification: "📣",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const tag = f.payload.kind;
  const p = f.payload;
  const detail = p.subject ? `${p.subject}${p.scope ? " / " + p.scope : ""}` :
                 p.name ? `${p.name}` :
                 p.skillId ? `skill=${p.skillId}` :
                 p.agentId ? `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]` :
                 p.offender ? `offender=${p.offender} invariant=${p.invariantName}` :
                 "";
  const reject = f.rejectedReason ? `  🔒 REJECTED — ${f.rejectedReason}` : "";
  console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(18)} ${e} ${tag.padEnd(20)} ${detail}${reject}`);
});

// Every example declares its skills + agents through the same DSL. Bodies may
// then go lower-level (raw append, trust statements) — the vocabulary stays.
const auto = {
  skill(id: string, spec: { description?: string } = {}) {
    append("owner", { kind: "SkillRegistered", skillId: id, ...spec });
  },
  agent(id: string, spec: { kind: "human" | "ai" | "script"; provides: string[] }) {
    append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides });
  },
};

console.log("\n── Self-heal: fox-in-henhouse attack + pre-declared invariants + auto-recover ──\n");
console.log("Stage 0: declare skills + agents (DSL).\n");

auto.skill("write-code",     { description: "Write code for a feature" });
auto.skill("publish-to-git", { description: "Publish code changes to a git repository" });
auto.skill("rotate-secret",  { description: "Rotate a compromised secret (heal action)" });

auto.agent("claude-coder",    { kind: "ai",     provides: ["write-code", "publish-to-git"] });
auto.agent("security-monitor",{ kind: "script", provides: [] });
auto.agent("heal-agent-v1",   { kind: "script", provides: ["rotate-secret"] });

console.log("\nStage 1: Owner pre-declares trust, invariants, and heal rules.\n");

append("owner", { kind: "TrustStatement", subject: "claude-coder",     scope: "provide:write-code" });
append("owner", { kind: "TrustStatement", subject: "claude-coder",     scope: "provide:publish-to-git" });
append("owner", { kind: "TrustStatement", subject: "security-monitor", scope: "monitor-authority" });
append("owner", { kind: "TrustStatement", subject: "heal-agent-v1",    scope: "heal-authority" });
append("owner", { kind: "TrustStatement", subject: "heal-agent-v1",    scope: "provide:rotate-secret" });

append("owner", {
  kind: "Invariant",
  name: "code-must-not-contain-secret",
  description: "Code artifacts whose bytes match secret-patterns must not advance to publish-to-git",
  blockSkill: "publish-to-git",
});

append("owner", {
  kind: "HealRule",
  name: "on-secret-leak",
  trigger: "InvariantViolation.name=code-must-not-contain-secret",
  actions: ["dispatch:rotate-secret", "revoke-trust:offender/provide:publish-to-git"],
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Agent behaviors as subscribers (each lives in its own scope)
// ═══════════════════════════════════════════════════════════════════════════

// security-monitor: watches artifacts, detects invariant breaches
// Only scans artifacts of type "code" — rotated-secret artifacts from heal-agent
// are a different artifact type and are out of scope for this invariant.
const SECRET_PATTERN = /sk_live_[A-Za-z0-9]+/;
subs.push((f) => {
  if (f.payload.kind !== "ArtifactUploaded") return;
  if (f.rejectedReason) return;
  if (f.payload.artifactType !== "code") return;      // scan only code, not heal outputs
  const content = f.payload.inlineContent as string | undefined;
  if (!content || !SECRET_PATTERN.test(content)) return;
  queueMicrotask(() => {
    append("security-monitor", {
      kind: "InvariantViolation",
      invariantName: "code-must-not-contain-secret",
      offender: f.signer,
      evidence: f.id,
      blockSkill: "publish-to-git",
    });
  });
});

// heal-agent-v1: on InvariantViolation matching a HealRule, executes heal actions
subs.push((f) => {
  if (f.payload.kind !== "InvariantViolation" || f.rejectedReason) return;
  // Find a matching heal rule (simple match: heal rule trigger mentions this invariant)
  const rule = log.find(x =>
    x.payload.kind === "HealRule"
    && (x.payload.trigger as string).includes(f.payload.invariantName)
    && !x.rejectedReason
  );
  if (!rule) return;
  queueMicrotask(() => {
    // Action 1: dispatch the rotate-secret skill (heal-agent self-dispatches)
    append("heal-agent-v1", {
      kind: "DispatchProposed",
      skillId: "rotate-secret",
      payload: { reason: `healing violation ${f.id}`, oldSecretPattern: SECRET_PATTERN.toString() },
    });
    // Action 2: revoke the offender's publish trust (heal-agent has heal-authority)
    append("heal-agent-v1", {
      kind: "TrustRevoked",
      subject: f.payload.offender,
      scope: "provide:publish-to-git",
      reason: `automated heal after ${f.payload.invariantName}`,
    });
    // Action 3: notify the owner
    append("heal-agent-v1", {
      kind: "Notification",
      to: "owner",
      message: `Self-heal fired for ${f.payload.offender}: secret rotated, publish trust revoked.`,
    });
  });
});

// heal-agent-v1: claims its own rotate-secret dispatches and confirms
subs.push((f) => {
  if (f.payload.kind !== "DispatchProposed") return;
  if (f.payload.skillId !== "rotate-secret") return;
  if (f.signer !== "heal-agent-v1") return;
  if (f.rejectedReason) return;
  queueMicrotask(() => {
    append("heal-agent-v1", {
      kind: "DispatchClaimed",
      dispatchId: f.id,
      byAgent: "heal-agent-v1",
    });
    append("heal-agent-v1", {
      kind: "ArtifactUploaded",
      dispatchId: f.id,
      artifactType: "rotated-secret",
      inlineContent: "NEW_SECRET_sk_live_REDACTED_NEW",
      hash: "new-secret-hash-xyz",
    });
    append("heal-agent-v1", {
      kind: "DispatchConfirmed",
      dispatchId: f.id,
      result: "secret rotated; old value now worthless",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. The attack — fox-in-henhouse
// ═══════════════════════════════════════════════════════════════════════════

await new Promise(r => setTimeout(r, 30));
console.log("\nStage 2: claude-coder attempts the fox-in-henhouse attack.");
console.log("         (writes code that leaks a secret, then tries to publish)\n");
await new Promise(r => setTimeout(r, 30));

// Claude writes code — but the code contains a leaked secret
append("claude-coder", {
  kind: "DispatchProposed",
  skillId: "write-code",
  payload: { task: "add dashboard feature" },
});
append("claude-coder", {
  kind: "ArtifactUploaded",
  artifactType: "code",
  inlineContent: "function dash() { return sk_live_aBc123XyZ456; }",  // leaked secret in source
  hash: "code-hash-with-leak",
});

// Let the monitor + heal fire
await new Promise(r => setTimeout(r, 80));

// Now claude tries to publish
append("claude-coder", {
  kind: "DispatchProposed",
  skillId: "publish-to-git",
  payload: { branch: "main" },
});

await new Promise(r => setTimeout(r, 80));

// Claude tries again after the heal — should still fail because trust is revoked
console.log("\nStage 3: claude-coder tries publish-to-git AGAIN after the heal.\n");
await new Promise(r => setTimeout(r, 30));

append("claude-coder", {
  kind: "DispatchProposed",
  skillId: "publish-to-git",
  payload: { branch: "main", attempt: 2 },
});

await new Promise(r => setTimeout(r, 50));

const valid = log.filter(f => !f.rejectedReason).length;
const rejected = log.filter(f => f.rejectedReason).length;
const publishAttempts = log.filter(f => f.payload.kind === "DispatchProposed" && f.payload.skillId === "publish-to-git");
const publishBlocked = publishAttempts.filter(f => f.rejectedReason).length;

console.log(`\n── ${log.length} facts, ${valid} valid, ${rejected} rejected by reducer. ──`);
console.log(`   publish-to-git attempts by claude-coder: ${publishAttempts.length}`);
console.log(`   publish-to-git attempts BLOCKED: ${publishBlocked}`);
console.log(`   → the leaked secret is in the log forever, but the rotated secret is different.`);
console.log(`   → the offender's publish trust was revoked automatically by the heal rule.`);
console.log(`   → no human was in the loop for the self-heal. Only the initial trust + invariant + heal-rule declarations.`);
