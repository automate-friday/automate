// examples/youtube-to-discord.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// Purpose
// ═══════════════════════════════════════════════════════════════════════════
//
// Demonstrate the Automate Friday DSL end-to-end in one file, with real AI
// agents (Haiku via `claude -p`) collaborating on a workflow through a
// shared fact log.
//
// The seven primitives exercised:
//   auto.skill      — declarative unit of work (with optional approval/toolbox gates)
//   auto.role       — attestation that a subject holds a role
//   auto.toolbox    — named capability bundle (governance)
//   auto.agent      — advertised capability, with a fulfillment function
//   auto.engine     — reactive policy that observes the log and dispatches
//   auto.workflow   — sensor-triggered composition of skills
//   auto.sequential — chain steps; later steps see earlier outputs
//
// The core value propositions this shows:
//   1. Declarative progressive automation
//      The same skill can be fulfilled by a human, an AI, or a script.
//      Trust graduation = reducer rule that relaxes approval requirements.
//   2. Decentralized collaboration
//      No participant calls another. They collaborate by appending facts
//      to a shared log and projecting views. Swap the in-memory log for a
//      socket/Convex/Git repo and this runs across machines.
//
// Run: bun examples/youtube-to-discord.ts

// ═══════════════════════════════════════════════════════════════════════════
// 1. FactLog — the substrate
// ═══════════════════════════════════════════════════════════════════════════

type Fact = { id: string; lamport: number; signer: string; payload: any };

const log: Fact[] = [];
const factSubscribers: Array<(f: Fact) => void> = [];
let nextLamport = 1;

function append(signer: string, payload: any): Fact {
  const fact: Fact = { id: `f${log.length + 1}`, lamport: nextLamport++, signer, payload };
  log.push(fact);
  for (const cb of factSubscribers) queueMicrotask(() => cb(fact));
  return fact;
}
function subscribe(cb: (f: Fact) => void) { factSubscribers.push(cb); }

// ═══════════════════════════════════════════════════════════════════════════
// 2. DSL — auto.*
// ═══════════════════════════════════════════════════════════════════════════

const registered = {
  skills:    new Map<string, any>(),
  agents:    new Map<string, any>(),
  toolboxes: new Map<string, any>(),
  workflows: new Map<string, any>(),
  engines:   new Map<string, any>(),
};

const auto = {
  skill(id: string, spec: { description?: string; requires_approval?: string; requires_toolbox?: string } = {}) {
    registered.skills.set(id, { id, ...spec });
    append("system", { kind: "SkillRegistered", skillId: id, ...spec });
    return { _kind: "skill" as const, id, ...spec };
  },
  role(subject: string, role: string) {
    append("system", { kind: "RoleAttested", subject, role });
  },
  toolbox(id: string, spec: { tools: string[] }) {
    registered.toolboxes.set(id, { id, ...spec });
    append("system", { kind: "ToolboxRegistered", toolboxId: id, tools: spec.tools });
  },
  agent(id: string, spec: { kind: "human" | "ai" | "script"; fulfills: string[]; toolbox?: string; run: (payload: any) => Promise<any> }) {
    registered.agents.set(id, { id, ...spec });
    append(id, { kind: "AgentOffered", agentId: id, agentKind: spec.kind, skills: spec.fulfills, toolbox: spec.toolbox });
  },
  engine(id: string, spec: { watches: string; run: (fact: Fact) => void | Promise<void> }) {
    registered.engines.set(id, { id, ...spec });
  },
  workflow(id: string, spec: { on: string; steps: any }) {
    registered.workflows.set(id, { id, ...spec });
  },
  sequential(...steps: any[]) { return { _kind: "sequential" as const, steps }; },
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. Runtime — dispatch lifecycle driven by log subscription
// ═══════════════════════════════════════════════════════════════════════════

function dispatch(from: string, skillId: string, payload: any): string {
  const dispatchId = `d${log.length + 1}`;
  append(from, { kind: "DispatchProposed", dispatchId, skillId, payload });
  return dispatchId;
}

// Engine: RBAC approver — when a dispatch needs approval and the required
// role is attested on some engine with an auto-approve policy, approve.
auto.engine("rbac-approver", {
  watches: "DispatchProposed",
  run: (fact) => {
    const skill = registered.skills.get(fact.payload.skillId);
    if (!skill?.requires_approval) return;
    // find who holds the required role (projection)
    const holders = log
      .filter(f => f.payload.kind === "RoleAttested" && f.payload.role === skill.requires_approval)
      .map(f => f.payload.subject);
    // auto-approve from the first holder (toy: real system would wait for human)
    if (holders.length > 0) {
      append(holders[0], { kind: "DispatchApproved", dispatchId: fact.payload.dispatchId });
    }
  },
});

// Engine: dispatcher — once a dispatch is claimable (no approval pending),
// pick the best agent (script > ai > human), invoke, and record the result.
auto.engine("dispatcher", {
  watches: "DispatchProposed|DispatchApproved",
  run: async (fact) => {
    // which dispatch is now eligible?
    let dispatchId: string;
    if (fact.payload.kind === "DispatchProposed") {
      const skill = registered.skills.get(fact.payload.skillId);
      if (skill?.requires_approval) return; // wait for approval
      dispatchId = fact.payload.dispatchId;
    } else {
      dispatchId = fact.payload.dispatchId;
    }

    const proposed = log.find(f => f.payload.kind === "DispatchProposed" && f.payload.dispatchId === dispatchId);
    if (!proposed) return;
    const already = log.some(f => f.payload.kind === "DispatchClaimed" && f.payload.dispatchId === dispatchId);
    if (already) return;
    const skill = registered.skills.get(proposed.payload.skillId);

    const rank: Record<string, number> = { script: 3, ai: 2, human: 1 };
    const eligible = [...registered.agents.values()]
      .filter(a => a.fulfills.includes(proposed.payload.skillId))
      .filter(a => !skill?.requires_toolbox || a.toolbox === skill.requires_toolbox)
      .sort((a, b) => rank[b.kind] - rank[a.kind]);

    if (eligible.length === 0) {
      append("dispatcher", { kind: "DispatchBlocked", dispatchId, reason: "no eligible agent" });
      return;
    }
    const chosen = eligible[0];
    append(chosen.id, { kind: "DispatchClaimed", dispatchId, byAgent: chosen.id });
    try {
      const result = await chosen.run(proposed.payload.payload);
      append(chosen.id, { kind: "DispatchConfirmed", dispatchId, result });
    } catch (err) {
      append(chosen.id, { kind: "DispatchBlocked", dispatchId, reason: String(err) });
    }
  },
});

// wire engine subscriptions
subscribe((fact) => {
  for (const engine of registered.engines.values()) {
    const kinds = engine.watches.split("|");
    if (kinds.includes(fact.payload.kind)) engine.run(fact);
  }
});

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
// 5. Scenario — YouTube → Discord with governance toolbox + approval gate
// ═══════════════════════════════════════════════════════════════════════════

// roles
auto.role("jacob-laptop", "owner");

// toolboxes — named capability bundles
auto.toolbox("content-tools", { tools: ["fetch-transcript", "call-llm-summarize", "post-discord-webhook"] });

// skills
auto.skill("summarize-video", {
  description: "Generate a concise summary of a YouTube video",
  requires_toolbox: "content-tools",
});
auto.skill("post-to-discord", {
  description: "Post a message to a Discord channel",
  requires_toolbox: "content-tools",
  requires_approval: "owner", // progressive automation: gated until trust graduates
});

// agents — each carries a toolbox and a fulfillment function
auto.agent("claude-summarizer", {
  kind: "ai",
  fulfills: ["summarize-video"],
  toolbox: "content-tools",
  run: async (payload) => {
    const prompt = `You are writing a one-sentence teaser for a new video given ONLY its title. Do not ask for more info. Infer a plausible angle from the title and write an engaging single sentence. Title: "${payload.title}". Return ONLY the sentence.`;
    const summary = await callHaiku(prompt);
    return { summary, emoji: "🎬" };
  },
});

auto.agent("discord-poster", {
  kind: "script",
  fulfills: ["post-to-discord"],
  toolbox: "content-tools",
  run: async (payload) => {
    // toy: would POST to Discord webhook in production
    console.log(`\n    📨 [Discord] #${payload.channel}: ${payload.content}\n`);
    return { messageId: `mock-${Date.now()}`, postedAt: new Date().toISOString() };
  },
});

// workflow — declares the chain; compiled to engine that dispatches sequentially
auto.workflow("youtube-to-discord", {
  on: "youtube",
  steps: auto.sequential(
    { _kind: "step", skill: "summarize-video", as: "summary" },
    { _kind: "step", skill: "post-to-discord", as: "posted" },
  ),
});

// compile the workflow into an orchestrator engine
auto.engine("youtube-to-discord-orchestrator", {
  watches: "SensorEmitted|DispatchConfirmed",
  run: (fact) => {
    if (fact.payload.kind === "SensorEmitted" && fact.payload.sensorId === "youtube") {
      dispatch("youtube-to-discord-orchestrator", "summarize-video", fact.payload.reading);
      return;
    }
    if (fact.payload.kind === "DispatchConfirmed") {
      const proposed = log.find(f => f.payload.kind === "DispatchProposed" && f.payload.dispatchId === fact.payload.dispatchId);
      if (proposed?.payload.skillId === "summarize-video") {
        const video = log.find(f => f.payload.kind === "SensorEmitted" && f.payload.sensorId === "youtube")!.payload.reading;
        const { summary, emoji } = fact.payload.result;
        dispatch("youtube-to-discord-orchestrator", "post-to-discord", {
          channel: "releases",
          content: `${emoji} New video: ${video.title} — ${summary}`,
        });
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Pretty log tail — watch the collaboration live
// ═══════════════════════════════════════════════════════════════════════════

const EMOJI: Record<string, string> = {
  SkillRegistered: "📘", ToolboxRegistered: "🧰", RoleAttested: "📜",
  AgentOffered: "🤝", SensorEmitted: "🎥", DispatchProposed: "📮",
  DispatchApproved: "✅", DispatchClaimed: "🙋", DispatchConfirmed: "🟢",
  DispatchBlocked: "🔒",
};
subscribe((fact) => {
  const emoji = EMOJI[fact.payload.kind] ?? "•";
  const tag = fact.payload.kind;
  const detail = fact.payload.skillId ? `skill=${fact.payload.skillId}` :
                 fact.payload.dispatchId ? `id=${fact.payload.dispatchId}` :
                 fact.payload.sensorId ? `sensor=${fact.payload.sensorId}` :
                 fact.payload.role ? `role=${fact.payload.role}` :
                 fact.payload.toolboxId ? `toolbox=${fact.payload.toolboxId}` :
                 fact.payload.agentId ? `agent=${fact.payload.agentId}` : "";
  console.log(`  [L${String(fact.lamport).padStart(3)}] ${fact.signer.padEnd(28)} ${emoji} ${tag.padEnd(20)} ${detail}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Run — simulate a YouTube video being published
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n── Automate Friday DSL toy: YouTube → Discord ──\n");
console.log("Scenario: a video is published. The summarize-video skill runs (AI, no");
console.log("approval). post-to-discord requires owner approval (progressive automation");
console.log("gate). Both skills require the content-tools toolbox (governance).\n");

await new Promise(r => setTimeout(r, 50)); // let bootstrap facts flush

append("youtube-bridge", {
  kind: "SensorEmitted",
  sensorId: "youtube",
  reading: { videoId: "abc123", title: "Building an agent coordination protocol", publishedAt: new Date().toISOString() },
});

// wait for the async chain to settle
await new Promise(r => setTimeout(r, 60_000));

console.log(`\n── Done. ${log.length} facts in the log. ──`);
