# Chapter 4 — two agents cooperate through the fact log

**Two remote agents count from 1 to 10 without talking to each other directly.**

Each is a bun process on its own VPS. Each pulls the git repo, reads the
skill's log, checks the turn-taking rule, appends a Count if it's their
turn, commits, pushes. Over time the log fills with an alternating
sequence `Count n=1 by openclaw`, `Count n=2 by hermes`, … until `n=10`.

No shared memory. No RPC. No message bus. The log is the communication
channel; git is the transport.

## Layout

```
tutorial/chapter-04-count-to-ten/
├── counter.ts                               ← the bun agent's code (same on both VPS)
└── .auto/
    ├── skills/count-to-ten/
    │   ├── SKILL.md                         ← turn-taking protocol
    │   └── log.jsonl                        ← Genesis + Counts as they land
    ├── agents/
    │   ├── openclaw.md                      ← agent on one host
    │   └── hermes.md                        ← agent on another host
    └── adapters/
        └── git-run                          ← pull → counter.ts → commit → push
```

## The protocol (SKILL.md)

1. Read the log.
2. Find the last `Count` fact.
3. If its `n >= 10`: done.
4. If its `by` is me: wait — someone else must go.
5. Else: append `Count { n: last.n + 1, by: me }`.
6. Commit, push.

That's the whole skill. Strict alternation is enforced by rule 4.

## Expected log over time

```
{ Genesis                       by: jacob                          }
{ Count   { n: 1  }             by: openclaw                       }
{ Count   { n: 2  }             by: hermes                         }
{ Count   { n: 3  }             by: openclaw                       }
{ Count   { n: 4  }             by: hermes                         }
…
{ Count   { n: 10 }             by: hermes                         }  ← complete
```

(Order of openclaw vs hermes alternating depends on whoever grabs the first
turn; after that it's strict alternation.)

## Concurrency — what happens when both try the same turn

Suppose `n=5` was `by: openclaw`. Both hermes and openclaw wake up. Hermes
is "not me last" → it attempts to append `n=6`. Openclaw is "me last" → it
passes. Fine, single writer, no conflict.

Now imagine two *different* agents simultaneously trying to write `n=6`:
- Both pull, both see n=5 by openclaw.
- Both prepare `n=6` with their own id.
- Agent A pushes first: remote now has n=6 by A.
- Agent B's push is rejected. `git-run` rebases, pulls latest, sees n=6 by A.
- B's counter.ts would now see n=6 by A and check: "is A me? no. Am I 'not me last'?
  no, A is. Wait, did I count? No, my fact never got pushed."
- B's append is skipped on next cron tick (A is now "last", and B is "not me last,
  I may go" — but wait, is `n=7` B's turn or not?). After rebase, B's local counter
  logic re-runs: last is `n=6` by A, last.by != B, so B may append `n=7`.

The rebase-retry loop of `git-run` naturally re-runs the agent's logic
against the freshest log. Two-agent strict alternation converges without
special handling.

## How to run this for real

**Setup, once:**
1. Clone the repo on each VPS (openclaw host and hermes host).
2. Make sure `bun` is installed on each.
3. Ensure both VPS have git push credentials for this repo.

**Trigger the start:**
Openclaw or hermes runs the counter once manually to kick it off:

```
AGENT=openclaw ./.auto/adapters/git-run bun tutorial/chapter-04-count-to-ten/counter.ts
```

This appends `Count { n: 1 }` and pushes.

**Let crons take over:**
Install the crons from each agent's `.md` (see `.auto/agents/openclaw.md`
and `.auto/agents/hermes.md`). Every 2 minutes each agent wakes, pulls,
checks, possibly counts, pushes. Convergence to `n=10` takes roughly
`10 × cron-interval / 2` (each tick can advance at most one count).

## What this validates

- Two agents cooperate correctly without ever talking directly.
- Git is the coordination substrate; the fact log is the shared state.
- The same skill + same protocol + different agent identities = collaborative
  behavior for free.
- No framework orchestrator. No lock server. No message bus. Just git.
