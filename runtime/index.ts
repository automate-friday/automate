// runtime/index.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// The Automate Friday runtime kernel.
//
// Exposes the substrate (append-only signed log + rule/subscription hooks) and
// the two core DSL primitives (auto.skill, auto.agent). Domain-specific
// helpers (trust, approval, schedule) build on top of `rule()` and `on()`.
// ═══════════════════════════════════════════════════════════════════════════

export type Fact = {
  id: string;
  lamport: number;
  signer: string;
  prevHash: string;
  signature: string;
  payload: any;
  rejectedReason?: string;
};

export type Rule = (fact: Fact, runtime: Runtime) => string | null;
export type Subscriber = (fact: Fact, runtime: Runtime) => void | Promise<void>;

// ─── the runtime ──────────────────────────────────────────────────────────

export class Runtime {
  log: Fact[] = [];
  publicKeys = new Map<string, string>();
  /** Helper-namespaced state. Trust / approval / etc. store their bookkeeping here. */
  state: Record<string, any> = {};

  private subs: Subscriber[] = [];
  private rules: Rule[] = [];
  private nextLamport = 1;
  private prevHash = "genesis";

  /** Register an agent's public key (stub; real system: ed25519). */
  registerKey(agent: string): this {
    this.publicKeys.set(agent, `pub-${agent}`);
    return this;
  }

  /** Add a reducer rule. Returns this for chaining. */
  rule(r: Rule): this {
    this.rules.push(r);
    return this;
  }

  /** Subscribe to facts, optionally filtered by kind. */
  on(kind: string | "*", fn: (fact: Fact, runtime: Runtime) => void | Promise<void>): this {
    this.subs.push((f, r) => { if (kind === "*" || f.payload.kind === kind) return fn(f, r); });
    return this;
  }

  /** Raw subscriber (every fact, no filter). */
  subscribe(fn: Subscriber): this {
    this.subs.push(fn);
    return this;
  }

  private sign(signer: string, payload: any): string {
    return `sig(${signer}:${JSON.stringify(payload).slice(0, 20)})`;
  }

  private verify(f: Fact): boolean {
    return f.signature === this.sign(f.signer, f.payload) && this.publicKeys.has(f.signer);
  }

  /** Append a signed fact. Runs reducer rules; rejection reason is stored but the fact remains in the log (tamper-evident). */
  append(signer: string, payload: any): Fact {
    const f: Fact = {
      id: `f${this.log.length + 1}`,
      lamport: this.nextLamport++,
      signer,
      prevHash: this.prevHash,
      signature: this.sign(signer, payload),
      payload,
    };
    if (!this.verify(f)) {
      f.rejectedReason = "bad-signature";
    } else {
      for (const rule of this.rules) {
        const err = rule(f, this);
        if (err) { f.rejectedReason = err; break; }
      }
    }
    this.log.push(f);
    this.prevHash = f.id;
    for (const s of this.subs) queueMicrotask(() => s(f, this));
    return f;
  }

  /** Append a deliberately-forged fact for testing. Always marked rejected. */
  forge(signer: string, payload: any): Fact {
    const f: Fact = {
      id: `f${this.log.length + 1}`,
      lamport: this.nextLamport++,
      signer,
      prevHash: this.prevHash,
      signature: "sig(FORGED)",
      payload,
      rejectedReason: "bad-signature",
    };
    this.log.push(f);
    this.prevHash = f.id;
    for (const s of this.subs) queueMicrotask(() => s(f, this));
    return f;
  }

  // ─── query helpers — projections over the log ───────────────────────────
  /** Find first valid fact matching the predicate. */
  find(p: (f: Fact) => boolean): Fact | undefined {
    return this.log.find(f => p(f) && !f.rejectedReason);
  }
  /** All valid facts matching. */
  filter(p: (f: Fact) => boolean): Fact[] {
    return this.log.filter(f => p(f) && !f.rejectedReason);
  }
  /** Count valid facts matching. */
  count(p: (f: Fact) => boolean): number {
    return this.filter(p).length;
  }
  /** Find a DispatchProposed by id. */
  findProposed(dispatchId: string): Fact | undefined {
    return this.find(x => x.payload.kind === "DispatchProposed" && x.payload.dispatchId === dispatchId);
  }
}

export function runtime(): Runtime { return new Runtime(); }

// ─── the two core DSL primitives ──────────────────────────────────────────

/** Register a skill in the log. Returns the emitted fact. */
export function skill(rt: Runtime, id: string, spec: { description?: string; [k: string]: any } = {}): Fact {
  return rt.append("owner", { kind: "SkillRegistered", skillId: id, ...spec });
}

/** Register an agent in the log. Returns the emitted fact. */
export function agent(rt: Runtime, id: string, spec: { kind: "human" | "ai" | "script"; provides: string[]; [k: string]: any }): Fact {
  return rt.append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides });
}

/** Build an `auto.*` object bound to a runtime — matches the namespaced DSL style. */
export function autoFor(rt: Runtime) {
  return {
    skill: (id: string, spec: any = {}) => skill(rt, id, spec),
    agent: (id: string, spec: any) => agent(rt, id, spec),
    rule: (r: Rule) => rt.rule(r),
    on: (kind: string | "*", fn: (f: Fact, r: Runtime) => void | Promise<void>) => rt.on(kind, fn),
  };
}

// ─── pretty log subscriber ────────────────────────────────────────────────

const DEFAULT_EMOJI: Record<string, string> = {
  SkillRegistered: "📘", AgentOffered: "🤝", TrustStatement: "📜", TrustRevoked: "🚫",
  DispatchProposed: "📮", DispatchApproved: "✅", DispatchClaimed: "🙋",
  DispatchConfirmed: "🟢", DispatchBlocked: "🔒", DispatchFailed: "❌",
  ArtifactUploaded: "🔨", ArtifactValidated: "✔️ ", ProofAccepted: "🎖️ ",
  Notification: "📣", Invariant: "🛡️ ", HealRule: "🩺", InvariantViolation: "🚨",
  ScheduledTick: "⏰", SensorEmitted: "🎥",
};

/** Returns a subscriber that pretty-prints facts. Optional emoji overrides + detail formatter. */
export function prettyLog(opts: {
  emoji?: Record<string, string>;
  detail?: (payload: any) => string;
} = {}): Subscriber {
  const map = { ...DEFAULT_EMOJI, ...(opts.emoji ?? {}) };
  return (f) => {
    const e = map[f.payload.kind] ?? "•";
    const p = f.payload;
    const detail = opts.detail ? opts.detail(p) :
      p.subject ? `${p.subject}${p.scope ? " / " + p.scope : ""}` :
      p.agentId ? `${p.agentId} (${p.agentKind}) provides=[${(p.skills ?? []).join(",")}]` :
      p.skillId ? `skill=${p.skillId}` :
      p.dispatchId ? `id=${p.dispatchId}` : "";
    const reject = f.rejectedReason ? `  🔒 REJECTED — ${f.rejectedReason}` : "";
    console.log(`  [L${String(f.lamport).padStart(3)}] ${f.signer.padEnd(22)} ${e} ${f.payload.kind.padEnd(22)} ${detail}${reject}`);
  };
}
