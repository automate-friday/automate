// runtime/trust.ts
//
// Trust statements as verifiable credentials. The owner grants narrow scopes
// to agents; trusted heal agents can revoke. The reducer enforces: only the
// owner can issue; only owner or an agent holding `heal-authority` can revoke.

import type { Fact, Rule, Runtime } from "./index";

type TrustState = Map<string, Set<string>>;  // subject → set of scopes

function getState(rt: Runtime): TrustState {
  if (!rt.state.trust) rt.state.trust = new Map();
  return rt.state.trust as TrustState;
}

function getRevoked(rt: Runtime): TrustState {
  if (!rt.state.revokedTrust) rt.state.revokedTrust = new Map();
  return rt.state.revokedTrust as TrustState;
}

/** Owner grants a trust scope to a subject. */
export function trust(rt: Runtime, subject: string, scope: string): Fact {
  const s = getState(rt);
  const current = s.get(subject) ?? new Set<string>();
  current.add(scope);
  s.set(subject, current);
  return rt.append("owner", { kind: "TrustStatement", subject, scope });
}

/** Revoke a trust scope. Only `owner` or an agent with `heal-authority` may do this. */
export function revoke(rt: Runtime, subject: string, scope: string, signer: string = "owner"): Fact {
  const r = getRevoked(rt);
  const current = r.get(subject) ?? new Set<string>();
  current.add(scope);
  r.set(subject, current);
  return rt.append(signer, { kind: "TrustRevoked", subject, scope });
}

/** Query: does subject hold a (non-revoked) trust scope? */
export function hasTrust(rt: Runtime, subject: string, scope: string): boolean {
  if (getRevoked(rt).get(subject)?.has(scope)) return false;
  return !!getState(rt).get(subject)?.has(scope);
}

/** Install the reducer rule that governs TrustStatement / TrustRevoked authority. */
export function installTrustRule(rt: Runtime): Runtime {
  rt.rule((f, r) => {
    const p = f.payload;
    if (p.kind === "TrustStatement" && f.signer !== "owner") {
      return "only-owner-may-issue-trust";
    }
    if (p.kind === "TrustRevoked" && f.signer !== "owner" && !hasTrust(r, f.signer, "heal-authority")) {
      return "only-owner-or-heal-agent-may-revoke";
    }
    return null;
  });
  return rt;
}
