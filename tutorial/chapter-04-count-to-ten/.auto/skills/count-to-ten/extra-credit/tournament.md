---
pattern: tournament
rounds: 3
mode: best-of
---

# Cooperation: tournament

Multiple agents each produce a candidate value; the best is selected by
a judge (or a vote). Useful when "correct" is a quality judgement, not
a protocol invariant.

## Protocol

1. Tournament begins: `RoundOpened{round, deadline}`.
2. Each agent appends `Candidate{round, by, value}` before the deadline.
3. A judge agent (or quorum of voters) appends
   `CandidateScored{round, candidateId, score}`.
4. Highest score becomes the official `Count{n}` for that round.

## Fact lifecycle

```
RoundOpened(round=1, n=1, deadline=T+60s)

Candidate(round=1, by=alice, value=1, id=C1)
Candidate(round=1, by=bob,   value=1, id=C2)
Candidate(round=1, by=carol, value=1, id=C3)

CandidateScored(round=1, id=C1, score=0.7)
CandidateScored(round=1, id=C2, score=0.9)  # winner
CandidateScored(round=1, id=C3, score=0.6)

Count(n=1, selectedFrom=C2, by=bob)
```

## When to use

- Quality matters more than ordering (code-review suggestions, creative
  work, plan generation).
- Multiple LLM agents with varying strengths; pick the best output.
- You want diversity at the proposal stage, selection at the commit
  stage.

Judge can be human, LLM, or a deterministic scorer. The fact log records
not just what happened but every alternative that was considered.
