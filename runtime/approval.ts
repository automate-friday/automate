// runtime/approval.ts
//
// Approval gates + graduation. The product thesis expressed as two composable
// reducer rules.
//
// Declare an approval policy for a skill:
//   - `by`: the role/agent id that must sign DispatchApproved
//   - `graduateAfter`: optional — after N confirmed dispatches of this skill
//                       with no rejections, subsequent ones skip approval
//   - `blocks`: which fact kind is gated until approval exists
//                (default: DispatchClaimed — claim can't happen without approval)

import type { Fact, Runtime } from "./index";

export type ApprovalPolicy = {
  skill: string;
  by: string;                 // signer required for DispatchApproved
  graduateAfter?: number;     // waive approval once this many confirms signed by the claimer
  blocks?: string;            // fact kind to gate (default: "DispatchClaimed")
};

function getPolicies(rt: Runtime): ApprovalPolicy[] {
  if (!rt.state.approvalPolicies) rt.state.approvalPolicies = [];
  return rt.state.approvalPolicies as ApprovalPolicy[];
}

/** Issue an approval. Syntactic sugar; the reducer rule validates signer authority. */
export function approve(rt: Runtime, dispatchId: string, approver: string = "owner"): Fact {
  return rt.append(approver, { kind: "DispatchApproved", dispatchId });
}

/** Register an approval policy + install the reducer rule that enforces it. */
export function requireApproval(rt: Runtime, policy: ApprovalPolicy): Runtime {
  const policies = getPolicies(rt);
  policies.push(policy);

  // Install the rule once (first policy triggers installation)
  if (!rt.state.approvalRuleInstalled) {
    rt.state.approvalRuleInstalled = true;
    rt.rule((f, r) => {
      const p = f.payload;

      // Rule A: only the configured approver signer may sign DispatchApproved
      if (p.kind === "DispatchApproved") {
        const proposed = r.findProposed(p.dispatchId);
        if (!proposed) return null;  // orphaned approval; let it in as no-op
        const matchingPolicy = getPolicies(r).find(x => x.skill === proposed.payload.skillId);
        if (matchingPolicy && f.signer !== matchingPolicy.by) {
          return `only-${matchingPolicy.by}-may-approve`;
        }
      }

      // Rule B: gated fact-kind (default DispatchClaimed) requires approval unless graduated
      const relevantPolicy = getPolicies(r).find(pol => p.kind === (pol.blocks ?? "DispatchClaimed"));
      if (!relevantPolicy) return null;
      if (!p.dispatchId) return null;
      const proposed = r.findProposed(p.dispatchId);
      if (!proposed || proposed.payload.skillId !== relevantPolicy.skill) return null;

      // Graduation check: if the claimer has enough track record, skip approval
      if (relevantPolicy.graduateAfter) {
        const claimer = p.byAgent ?? f.signer;
        const confirms = r.count(x =>
          x.payload.kind === "DispatchConfirmed"
          && x.payload.skillId === relevantPolicy.skill
          && x.payload.byAgent === claimer
        );
        if (confirms >= relevantPolicy.graduateAfter) return null;  // graduated
      }

      // Approval must exist
      const approved = r.find(x =>
        x.payload.kind === "DispatchApproved"
        && x.payload.dispatchId === p.dispatchId
        && x.signer === relevantPolicy.by
      );
      if (!approved) return "approval-required";
      return null;
    });
  }
  return rt;
}

/** Check whether a dispatch's approval gate is currently satisfied (for queries). */
export function isApproved(rt: Runtime, dispatchId: string): boolean {
  const proposed = rt.findProposed(dispatchId);
  if (!proposed) return false;
  const policy = getPolicies(rt).find(p => p.skill === proposed.payload.skillId);
  if (!policy) return true;  // no policy, no gate
  return !!rt.find(x =>
    x.payload.kind === "DispatchApproved"
    && x.payload.dispatchId === dispatchId
    && x.signer === policy.by
  );
}

/** Check whether a claimer has graduated for a given skill. */
export function hasGraduated(rt: Runtime, claimer: string, skill: string): boolean {
  const policy = getPolicies(rt).find(p => p.skill === skill);
  if (!policy?.graduateAfter) return false;
  const confirms = rt.count(x =>
    x.payload.kind === "DispatchConfirmed"
    && x.payload.skillId === skill
    && x.payload.byAgent === claimer
  );
  return confirms >= policy.graduateAfter;
}
