// examples/youtube-to-discord.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Purpose
// ═══════════════════════════════════════════════════════════════════════════
//
// Automate Friday with just TWO primitives: auto.skill and auto.agent.
//
// Everything else is expressed as skills or agents:
//   • A workflow is a composite skill (SKILL.md with a `steps:` block)
//   • A role is a skill that only certain agents provide (e.g. `approve-*`)
//   • A tool is a deterministic skill (a `script` agent provides it)
//   • An engine is an agent that subscribes to the log
//
// The framework's unique value is the opinionated orchestrator: it reads
// rules from skill frontmatter and enforces them deterministically —
// waiting on approvals, chaining sub-skills, refusing ineligible claims,
// logging every decision for audit.
//
// Run: bun examples/youtube-to-discord.ts

// ═══════════════════════════════════════════════════════════════════════════
// 1. FactLog — append-only substrate. In production this could be Git,
//     Convex, Postgres, or S3. The framework doesn't own it.
// ═══════════════════════════════════════════════════════════════════════════

type Fact = { id: string; lamport: number; signer: string; payload: any };

const log: Fact[] = [];
const subscribers: Array<(f: Fact) => void | Promise<void>> = [];
let nextLamport = 1;

function append(signer: string, payload: any): Fact {
  const fact: Fact = { id: `f${log.length + 1}`, lamport: nextLamport++, signer, payload };
  log.push(fact);
  for (const cb of subscribers) queueMicrotask(() => cb(fact));
  return fact;
}
function subscribe(cb: (f: Fact) => void | Promise<void>) { subscribers.push(cb); }
function find(kind: string, dispatchId: string) {
  return log.find(f => f.payload.kind === kind && f.payload.dispatchId === dispatchId);
}
function has(kind: string, dispatchId: string) { return !!find(kind, dispatchId); }

// ═══════════════════════════════════════════════════════════════════════════
// 2. Two primitives — auto.skill and auto.agent.
// ═══════════════════════════════════════════════════════════════════════════

type SkillSpec = {
  description?: string;
  trigger?: string;                                // sensor event that fires this skill
  requires_approval?: string;                      // approval skill that gates this dispatch
  steps?: Array<{ skill: string; as?: string; with?: (ctx: any) => any }>;  // composite
};

type AgentSpec = {
  kind: "human" | "ai" | "script";
  provides: string[];
  run: (payload: any) => Promise<any>;
};

const skills = new Map<string, SkillSpec & { id: string }>();
const agents = new Map<string, AgentSpec & { id: string }>();

const auto = {
  skill(id: string, spec: SkillSpec = {}) {
    skills.set(id, { id, ...spec });
    append("system", { kind: "SkillRegistered", skillId: id, ...spec });
  },
  agent(id: string, spec: AgentSpec) {
    agents.set(id, { id, ...spec });
    append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.provides });
  },
};

function dispatch(from: string, skillId: string, payload: any): string {
  const dispatchId = `d${log.length + 1}`;
  append(from, { kind: "DispatchProposed", dispatchId, skillId, payload });
  return dispatchId;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Governance orchestrator — the framework's unique value.
//     Reads rules from skill frontmatter, enforces them deterministically.
// ═══════════════════════════════════════════════════════════════════════════

// Rule A: trigger — when a sensor fires, any skill declaring that trigger dispatches.
subscribe((fact) => {
  if (fact.payload.kind !== "SensorEmitted") return;
  for (const skill of skills.values()) {
    if (skill.trigger === fact.payload.sensorId) {
      dispatch("sensor-trigger", skill.id, fact.payload.reading);
    }
  }
});

// Rule B: approval — if a skill requires_approval (which is itself a skill),
// dispatch the approval skill and wait. When it confirms, append DispatchApproved.
subscribe(async (fact) => {
  if (fact.payload.kind !== "DispatchProposed") return;
  const skill = skills.get(fact.payload.skillId);
  if (!skill?.requires_approval) return;
  if (has("DispatchApproved", fact.payload.dispatchId)) return;
  const parentId = fact.payload.dispatchId;
  // dispatch approval skill exactly once
  const existingApproval = log.find(f =>
    f.payload.kind === "DispatchProposed"
    && f.payload.skillId === skill.requires_approval
    && f.payload.payload?.__forDispatch === parentId
  );
  if (existingApproval) return;
  dispatch("governance", skill.requires_approval, { __forDispatch: parentId });
});

// Rule C: approval confirmation — when an approval skill confirms, append
// DispatchApproved for the parent dispatch.
subscribe((fact) => {
  if (fact.payload.kind !== "DispatchConfirmed") return;
  const proposed = find("DispatchProposed", fact.payload.dispatchId);
  const forDispatch = proposed?.payload.payload?.__forDispatch;
  if (!forDispatch) return;
  if (has("DispatchApproved", forDispatch)) return;
  append(fact.signer, { kind: "DispatchApproved", dispatchId: forDispatch });
});

// Rule D: main dispatcher — claim, run, confirm. Handles composite skills
// (with `steps:`) by orchestrating sub-dispatches directly.
subscribe(async (fact) => {
  let dispatchId: string | null = null;
  if (fact.payload.kind === "DispatchProposed") {
    const skill = skills.get(fact.payload.skillId);
    if (skill?.requires_approval) return;  // wait for Rule B+C to approve
    dispatchId = fact.payload.dispatchId;
  } else if (fact.payload.kind === "DispatchApproved") {
    dispatchId = fact.payload.dispatchId;
  }
  if (!dispatchId) return;
  if (has("DispatchClaimed", dispatchId)) return;  // don't double-claim

  const proposed = find("DispatchProposed", dispatchId);
  if (!proposed) return;
  const skillId = proposed.payload.skillId;
  const skill = skills.get(skillId);
  const input = proposed.payload.payload;

  // Composite skill → orchestrate directly (no agent involved)
  if (skill?.steps) {
    append("orchestrator", { kind: "DispatchClaimed", dispatchId, byAgent: "orchestrator" });
    const ctx: any = { ...input };
    try {
      for (const step of skill.steps) {
        const subPayload = step.with ? step.with(ctx) : ctx;
        const subId = dispatch("orchestrator", step.skill, subPayload);
        const result = await awaitDispatchResult(subId);
        if (result.__blocked) throw new Error(`sub-dispatch blocked: ${result.reason}`);
        if (step.as) ctx[step.as] = result;
      }
      append("orchestrator", { kind: "DispatchConfirmed", dispatchId, result: ctx });
    } catch (err) {
      append("orchestrator", { kind: "DispatchBlocked", dispatchId, reason: String(err) });
    }
    return;
  }

  // Leaf skill → find an agent, prefer script > ai > human
  const rank: Record<string, number> = { script: 3, ai: 2, human: 1 };
  const eligible = [...agents.values()]
    .filter(a => a.provides.includes(skillId))
    .sort((a, b) => rank[b.kind] - rank[a.kind]);
  if (eligible.length === 0) {
    append("orchestrator", { kind: "DispatchBlocked", dispatchId, reason: "no eligible agent" });
    return;
  }
  const chosen = eligible[0];
  append(chosen.id, { kind: "DispatchClaimed", dispatchId, byAgent: chosen.id });
  try {
    const result = await chosen.run(input);
    append(chosen.id, { kind: "DispatchConfirmed", dispatchId, result });
  } catch (err) {
    append(chosen.id, { kind: "DispatchBlocked", dispatchId, reason: String(err) });
  }
});

function awaitDispatchResult(dispatchId: string): Promise<any> {
  return new Promise((resolve) => {
    const cb = (f: Fact) => {
      if (f.payload.dispatchId !== dispatchId) return;
      if (f.payload.kind === "DispatchConfirmed") resolve(f.payload.result);
      else if (f.payload.kind === "DispatchBlocked") resolve({ __blocked: true, reason: f.payload.reason });
    };
    subscribers.push(cb);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Haiku via `claude -p` — no API key required
// ═══════════════════════════════════════════════════════════════════════════

async function callHaiku(prompt: string): Promise<string> {
  const proc = Bun.spawn(["claude", "-p", prompt, "--model", "claude-haiku-4-5-20251001"], { stdout: "pipe", stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  return output.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Scenario — four skills, three agents. No workflow/role/engine primitives.
// ═══════════════════════════════════════════════════════════════════════════

auto.skill("summarize-video", {
  description: "Generate a one-sentence teaser for a YouTube video.",
});

auto.skill("post-to-discord", {
  description: "Post a message to a Discord channel.",
  requires_approval: "approve-post-to-discord",
});

auto.skill("approve-post-to-discord", {
  description: "Approve a post-to-discord dispatch. Only agents with 'owner' authority provide this.",
});

auto.skill("youtube-to-discord", {
  description: "When a video is published, summarize and post to Discord.",
  trigger: "youtube",
  steps: [
    { skill: "summarize-video", as: "summary" },
    { skill: "post-to-discord", with: (ctx: any) => ({ channel: "releases", content: `🎬 ${ctx.summary?.summary ?? ctx.summary}` }) },
  ],
});

auto.agent("claude-summarizer", {
  kind: "ai",
  provides: ["summarize-video"],
  run: async (payload) => {
    const prompt = `Write a one-sentence teaser for a new video given ONLY its title. Do not ask for more info. Title: "${payload.title}". Return ONLY the sentence.`;
    return { summary: await callHaiku(prompt) };
  },
});

auto.agent("discord-poster", {
  kind: "script",
  provides: ["post-to-discord"],
  run: async (payload) => {
    console.log(`\n    📨 [Discord] #${payload.channel}: ${payload.content}\n`);
    return { messageId: `mock-${Date.now()}`, postedAt: new Date().toISOString() };
  },
});

// Collapsed "owner role" = an agent that provides approve-* skills.
auto.agent("jacob-laptop", {
  kind: "human",
  provides: ["approve-post-to-discord"],
  run: async () => {
    await new Promise(r => setTimeout(r, 20));  // toy: simulate human click
    return { approved: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Pretty log tail
// ═══════════════════════════════════════════════════════════════════════════

const EMOJI: Record<string, string> = {
  SkillRegistered: "📘", AgentOffered: "🤝", SensorEmitted: "🎥",
  DispatchProposed: "📮", DispatchApproved: "✅", DispatchClaimed: "🙋",
  DispatchConfirmed: "🟢", DispatchBlocked: "🔒",
};
subscribe((fact) => {
  const emoji = EMOJI[fact.payload.kind] ?? "•";
  const tag = fact.payload.kind;
  const detail = fact.payload.skillId ? `skill=${fact.payload.skillId}` :
                 fact.payload.dispatchId ? `id=${fact.payload.dispatchId}` :
                 fact.payload.sensorId ? `sensor=${fact.payload.sensorId}` :
                 fact.payload.agentId ? `agent=${fact.payload.agentId}` : "";
  console.log(`  [L${String(fact.lamport).padStart(3)}] ${fact.signer.padEnd(22)} ${emoji} ${tag.padEnd(20)} ${detail}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Run — a YouTube video is published
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n── Automate Friday: two primitives (skill + agent) ──");
console.log("4 skills declared, 3 agents provide. No workflow/role/engine.\n");

await new Promise(r => setTimeout(r, 50));

append("youtube-bridge", {
  kind: "SensorEmitted",
  sensorId: "youtube",
  reading: { videoId: "abc123", title: "Building an agent coordination protocol", publishedAt: new Date().toISOString() },
});

// Give Haiku time to respond (cold start ~10-15s; demo usually completes <25s)
await new Promise(r => setTimeout(r, 30_000));

console.log(`\n── Done. ${log.length} facts in the log. ──`);
