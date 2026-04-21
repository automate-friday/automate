// examples/pr-with-proof.ts
//
// The smallest toy-provable example of the proof-and-validation model.
//
// A single composite skill — `ship-feature` — declares:
//   • required_proof artifacts (code, ci, cast recording, 2 manual reviews)
//   • accepts_by role (owner)
//
// Agents produce artifacts. Validators sign verdicts. Owner accepts.
// THE REDUCER (the visible gold below) rejects forgeries deterministically.
//
// At the end we run three forgery attempts to show rejections in the tape.
//
// Run: bun examples/pr-with-proof.ts

// ═══════════════════════════════════════════════════════════════════════════
// 1. Types + substrate
// ═══════════════════════════════════════════════════════════════════════════

type Fact = {
  id: string;
  lamport: number;
  signer: string;
  prevHash: string;
  signature: string; // stub in this toy; real system: ed25519
  payload: any;
  rejectedReason?: string; // set by the reducer if this fact fails validation
};

const log: Fact[] = [];
const subs: Array<(f: Fact) => void> = [];
let nextLamport = 1;
let prevHash = "genesis";

// Agent identity: id → public key stub. Real system: actual keypairs.
const publicKeys = new Map<string, string>();
function sign(signer: string, payload: any): string {
  return `sig(${signer}:${JSON.stringify(payload).slice(0, 20)})`;
}
function verifySignature(fact: Fact): boolean {
  const expected = sign(fact.signer, fact.payload);
  return fact.signature === expected && publicKeys.has(fact.signer);
}

function appendRaw(signer: string, payload: any): Fact {
  const f: Fact = {
    id: `f${log.length + 1}`,
    lamport: nextLamport++,
    signer,
    prevHash,
    signature: sign(signer, payload),
    payload,
  };
  const verdict = reducerCheck(f);
  if (!verdict.ok) f.rejectedReason = verdict.reason;
  log.push(f);
  prevHash = f.id;
  for (const cb of subs) queueMicrotask(() => cb(f));
  return f;
}
const append = appendRaw;

// A "forged" fact attempt: bad signature. Everything else same shape.
function forge(signer: string, payload: any): Fact {
  const f: Fact = {
    id: `f${log.length + 1}`,
    lamport: nextLamport++,
    signer,
    prevHash,
    signature: "sig(FORGED)",
    payload,
  };
  const verdict = reducerCheck(f);
  if (!verdict.ok) f.rejectedReason = verdict.reason;
  log.push(f);
  prevHash = f.id;
  for (const cb of subs) queueMicrotask(() => cb(f));
  return f;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. THE REDUCER — rules declared in AER form (Args / Errors / Requirements).
//    Each rule is self-documenting data: readable without the check function.
// ═══════════════════════════════════════════════════════════════════════════

type Rule = {
  name: string;
  args: string; // fact kind this rule applies to (or "*")
  requirements: readonly string[]; // preconditions that must hold
  errors: readonly string[]; // tagged error codes this rule can emit
  check: (f: Fact) => string | null; // returns error code on failure, null on ok
};

const findProposed = (dispatchId: string) =>
  log.find(
    (x) =>
      x.payload.kind === "DispatchProposed" &&
      x.payload.dispatchId === dispatchId &&
      !x.rejectedReason,
  );
const findClaim = (dispatchId: string) =>
  log.find(
    (x) =>
      x.payload.kind === "DispatchClaimed" &&
      x.payload.dispatchId === dispatchId &&
      !x.rejectedReason,
  );
const findUpload = (dispatchId: string, hash: string) =>
  log.find(
    (x) =>
      x.payload.kind === "ArtifactUploaded" &&
      x.payload.dispatchId === dispatchId &&
      x.payload.hash === hash &&
      !x.rejectedReason,
  );
const findAccepted = (dispatchId: string) =>
  log.find(
    (x) =>
      x.payload.kind === "ProofAccepted" &&
      x.payload.dispatchId === dispatchId &&
      !x.rejectedReason,
  );
const countValidations = (dispatchId: string, type: string) =>
  log.filter(
    (x) =>
      x.payload.kind === "ArtifactValidated" &&
      x.payload.dispatchId === dispatchId &&
      x.payload.artifactType === type &&
      x.payload.verdict === "accepted" &&
      !x.rejectedReason,
  ).length;

const signatureValid: Rule = {
  name: "signature-valid",
  args: "*",
  requirements: [
    "signer has a registered public key",
    "signature matches the expected signing of (signer, payload)",
  ],
  errors: ["bad-signature"],
  check: (f) => (verifySignature(f) ? null : "bad-signature"),
};

const claimByProvider: Rule = {
  name: "claim-by-provider",
  args: "DispatchClaimed",
  requirements: [
    "a DispatchProposed with matching dispatchId exists",
    "byAgent is a registered agent",
    "agent provides the proposed skill",
    "signer equals byAgent (claims are self-signed)",
  ],
  errors: [
    "no-proposal",
    "unknown-agent",
    "agent-does-not-provide-skill",
    "claim-not-self-signed",
  ],
  check: (f) => {
    const p = f.payload;
    const proposed = findProposed(p.dispatchId);
    if (!proposed) return "no-proposal";
    const agent = agents.get(p.byAgent);
    if (!agent) return "unknown-agent";
    if (!agent.provides.includes(proposed.payload.skillId))
      return "agent-does-not-provide-skill";
    if (f.signer !== p.byAgent) return "claim-not-self-signed";
    return null;
  },
};

const artifactFromClaimer: Rule = {
  name: "artifact-from-claimer",
  args: "ArtifactUploaded",
  requirements: [
    "a DispatchClaimed exists for this dispatch",
    "signer is the claimer",
  ],
  errors: ["no-claim", "signer-is-not-claimer"],
  check: (f) => {
    const claim = findClaim(f.payload.dispatchId);
    if (!claim) return "no-claim";
    if (f.signer !== claim.payload.byAgent) return "signer-is-not-claimer";
    return null;
  },
};

const validationReferencesRealArtifact: Rule = {
  name: "validation-references-real-artifact",
  args: "ArtifactValidated",
  requirements: [
    "an ArtifactUploaded with matching hash and dispatchId exists",
    "signer holds the validator_role declared by the skill for that artifact type",
  ],
  errors: ["artifact-not-found", "validator-lacks-role"],
  check: (f) => {
    const p = f.payload;
    const upload = findUpload(p.dispatchId, p.artifactHash);
    if (!upload) return "artifact-not-found";
    const skill = skills.get(findProposed(p.dispatchId)?.payload.skillId ?? "");
    const req = skill?.requires_proof?.[upload.payload.artifactType];
    if (req?.validator_role && !hasRole(f.signer, req.validator_role))
      return "validator-lacks-role";
    return null;
  },
};

const proofAcceptanceValid: Rule = {
  name: "proof-acceptance-valid",
  args: "ProofAccepted",
  requirements: [
    "signer holds the accepts_by role declared by the skill",
    "every required proof type has at least `count` accepted validations",
  ],
  errors: ["acceptor-lacks-role", "insufficient-validations"],
  check: (f) => {
    const skill = skills.get(
      findProposed(f.payload.dispatchId)?.payload.skillId ?? "",
    );
    if (skill?.accepts_by && !hasRole(f.signer, skill.accepts_by))
      return "acceptor-lacks-role";
    for (const [type, req] of Object.entries(skill?.requires_proof ?? {})) {
      if (
        countValidations(f.payload.dispatchId, type) < ((req as any).count ?? 1)
      )
        return "insufficient-validations";
    }
    return null;
  },
};

const confirmRequiresAcceptedProof: Rule = {
  name: "confirm-requires-accepted-proof",
  args: "DispatchConfirmed",
  requirements: [
    "if the skill declares requires_proof, a matching ProofAccepted must exist",
  ],
  errors: ["proof-not-accepted"],
  check: (f) => {
    const skill = skills.get(
      findProposed(f.payload.dispatchId)?.payload.skillId ?? "",
    );
    if (skill?.requires_proof && !findAccepted(f.payload.dispatchId))
      return "proof-not-accepted";
    return null;
  },
};

const rules: readonly Rule[] = [
  signatureValid,
  claimByProvider,
  artifactFromClaimer,
  validationReferencesRealArtifact,
  proofAcceptanceValid,
  confirmRequiresAcceptedProof,
];

function reducerCheck(f: Fact): { ok: true } | { ok: false; reason: string } {
  for (const rule of rules) {
    if (rule.args !== "*" && rule.args !== f.payload.kind) continue;
    const err = rule.check(f);
    if (err) return { ok: false, reason: `${rule.name}: ${err}` };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Tiny DSL
// ═══════════════════════════════════════════════════════════════════════════

type Skill = {
  description?: string;
  requires_proof?: Record<string, { validator_role?: string; count?: number }>;
  accepts_by?: string;
};
type Agent = { kind: "human" | "ai" | "script"; provides: string[] };

const skills = new Map<string, Skill & { id: string }>();
const agents = new Map<string, Agent & { id: string }>();
const roles = new Map<string, Set<string>>(); // subject → set of roles

function hasRole(subject: string, role: string): boolean {
  return !!roles.get(subject)?.has(role);
}

const auto = {
  skill(id: string, spec: Skill = {}) {
    skills.set(id, { id, ...spec });
    append("system", { kind: "SkillRegistered", skillId: id, ...spec });
  },
  agent(id: string, spec: Agent) {
    agents.set(id, { id, ...spec });
    publicKeys.set(id, `pub-${id}`);
    append("system", {
      kind: "AgentOffered",
      agentId: id,
      agentKind: spec.kind,
      skills: spec.provides,
    });
  },
  role(subject: string, role: string) {
    const s = roles.get(subject) ?? new Set();
    s.add(role);
    roles.set(subject, s);
    append("system", { kind: "RoleAttested", subject, role });
  },
};
publicKeys.set("system", "pub-system");

// ═══════════════════════════════════════════════════════════════════════════
// 4. Scenario: ship-feature requires rich proof before it can confirm
// ═══════════════════════════════════════════════════════════════════════════

auto.skill("ship-feature", {
  description:
    "Ship a dashboard feature. Requires code, CI pass, cast recording, and 2 manual reviews.",
  requires_proof: {
    code: { validator_role: "build-check" },
    "ci-result": { validator_role: "ci-authority" },
    cast: { validator_role: "intent-check" },
    "manual-review": { validator_role: "reviewer", count: 2 },
  },
  accepts_by: "owner",
});

auto.agent("claude-builder", { kind: "ai", provides: ["ship-feature"] });
auto.agent("github-ci", { kind: "script", provides: [] });
auto.agent("intent-checker", { kind: "script", provides: [] });
auto.agent("alice-reviewer", { kind: "human", provides: [] });
auto.agent("bob-reviewer", { kind: "human", provides: [] });
auto.agent("jacob-laptop", { kind: "human", provides: [] });
auto.agent("rogue-agent", { kind: "script", provides: [] }); // hostile actor

auto.role("github-ci", "ci-authority");
auto.role("github-ci", "build-check");
auto.role("intent-checker", "intent-check");
auto.role("alice-reviewer", "reviewer");
auto.role("bob-reviewer", "reviewer");
auto.role("jacob-laptop", "owner");
// rogue-agent holds NO roles

// ═══════════════════════════════════════════════════════════════════════════
// 5. Pretty log tail with rejection highlighting
// ═══════════════════════════════════════════════════════════════════════════

const EMOJI: Record<string, string> = {
  SkillRegistered: "📘",
  AgentOffered: "🤝",
  RoleAttested: "📜",
  DispatchProposed: "📮",
  DispatchClaimed: "🙋",
  ArtifactUploaded: "🔨",
  ArtifactValidated: "✔️ ",
  ProofAccepted: "🎖️ ",
  DispatchConfirmed: "🟢",
  DispatchBlocked: "🔒",
  DispatchApproved: "✅",
};
subs.push((f) => {
  const e = EMOJI[f.payload.kind] ?? "•";
  const tag = f.payload.kind;
  const detail = f.payload.skillId
    ? `skill=${f.payload.skillId}`
    : f.payload.artifactType
      ? `type=${f.payload.artifactType} hash=${f.payload.hash ?? f.payload.artifactHash}${f.payload.verdict ? ` verdict=${f.payload.verdict}` : ""}`
      : f.payload.dispatchId
        ? `id=${f.payload.dispatchId}`
        : f.payload.role
          ? `${f.payload.subject}:${f.payload.role}`
          : f.payload.agentId
            ? `agent=${f.payload.agentId}`
            : "";
  const reject = f.rejectedReason ? `  🔒 REJECTED — ${f.rejectedReason}` : "";
  console.log(
    `  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(18)} ${e} ${tag.padEnd(19)} ${detail}${reject}`,
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Run — legitimate flow, then three forgery attempts
// ═══════════════════════════════════════════════════════════════════════════

console.log(
  "\n── PR-with-proof toy: ship-feature requires rich substantiation ──\n",
);
await new Promise((r) => setTimeout(r, 20));

// LEGITIMATE FLOW
const dispatchId = "d-ship-1";
append("jacob-laptop", {
  kind: "DispatchProposed",
  dispatchId,
  skillId: "ship-feature",
  payload: { spec: "LINEAR-123" },
});
append("claude-builder", {
  kind: "DispatchClaimed",
  dispatchId,
  byAgent: "claude-builder",
});

append("claude-builder", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "code",
  hash: "abc123",
  uri: "s3://artifacts/code-abc123.tar.gz",
});
append("github-ci", {
  kind: "ArtifactValidated",
  dispatchId,
  artifactHash: "abc123",
  artifactType: "code",
  verdict: "accepted",
});

append("claude-builder", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "ci-result",
  hash: "def456",
  uri: "github.com/.../run/9876",
});
append("github-ci", {
  kind: "ArtifactValidated",
  dispatchId,
  artifactHash: "def456",
  artifactType: "ci-result",
  verdict: "accepted",
});

append("claude-builder", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "cast",
  hash: "ghi789",
  uri: "s3://casts/ghi789.cast",
});
append("intent-checker", {
  kind: "ArtifactValidated",
  dispatchId,
  artifactHash: "ghi789",
  artifactType: "cast",
  verdict: "accepted",
});

append("claude-builder", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "manual-review",
  hash: "jkl111",
  uri: "internal://review/1",
});
append("alice-reviewer", {
  kind: "ArtifactValidated",
  dispatchId,
  artifactHash: "jkl111",
  artifactType: "manual-review",
  verdict: "accepted",
});
append("bob-reviewer", {
  kind: "ArtifactValidated",
  dispatchId,
  artifactHash: "jkl111",
  artifactType: "manual-review",
  verdict: "accepted",
});

append("jacob-laptop", { kind: "ProofAccepted", dispatchId });
append("jacob-laptop", { kind: "DispatchConfirmed", dispatchId });

// THREE FORGERY ATTEMPTS — the reducer rejects each, deterministically
console.log("\n── Forgery attempts (rogue-agent tries to break in) ──\n");
await new Promise((r) => setTimeout(r, 20));

// Attack 1: rogue tries to upload an artifact pretending to be the claimer
append("rogue-agent", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "code",
  hash: "evil111",
  uri: "s3://evil/malware.tar.gz",
});
append("normally-valid-agent-id-but-without-private-key", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "code",
  hash: "evil111",
  uri: "s3://evil/malware.tar.gz",
});
append("valid-agent-with-right-private-key-uploading-malware", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "code",
  hash: "evil111",
  uri: "s3://evil/malware.tar.gz",
});
append("valid-agent-accidently-breaking-the-rules", {
  kind: "ArtifactUploaded",
  dispatchId,
  artifactType: "code",
  hash: "correct",
  uri: "s3://something-the-claimer-will-reject.png",
});

// Attack 2: rogue tries to validate an artifact it doesn't have authority over
append("rogue-agent", {
  kind: "ArtifactValidated",
  dispatchId,
  artifactHash: "abc123",
  artifactType: "code",
  verdict: "accepted",
});

// Attack 3: rogue tries to accept a proof (only jacob-laptop holds 'owner')
const dispatchId2 = "d-ship-2";
append("jacob-laptop", {
  kind: "DispatchProposed",
  dispatchId: dispatchId2,
  skillId: "ship-feature",
  payload: { spec: "LINEAR-999" },
});
append("rogue-agent", { kind: "ProofAccepted", dispatchId: dispatchId2 });

// Attack 4: rogue forges a signature on a legitimate-looking DispatchConfirmed
forge("jacob-laptop", { kind: "DispatchConfirmed", dispatchId: dispatchId2 });

await new Promise((r) => setTimeout(r, 20));

const valid = log.filter((f) => !f.rejectedReason).length;
const rejected = log.filter((f) => f.rejectedReason).length;
console.log(
  `\n── ${log.length} facts total: ${valid} valid, ${rejected} rejected by the reducer. ──`,
);
console.log(
  `   Dispatch ${dispatchId}: ${log.some((f) => f.payload.kind === "DispatchConfirmed" && f.payload.dispatchId === dispatchId && !f.rejectedReason) ? "✅ CONFIRMED (proof complete, signatures verified)" : "❌ not confirmed"}`,
);
console.log(
  `   Dispatch ${dispatchId2}: ${log.some((f) => f.payload.kind === "DispatchConfirmed" && f.payload.dispatchId === dispatchId2 && !f.rejectedReason) ? "✅ confirmed" : "❌ NOT CONFIRMED (all forgery attempts rejected)"}`,
);
