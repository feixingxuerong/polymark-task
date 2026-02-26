# Subagent Playbook

Main agent acts as orchestrator only.

## Dispatch Loop

1. Pick top priority open issue.
2. Define exact acceptance criteria.
3. Spawn parallel subagents for independent sub-tasks.
4. Collect outputs and run acceptance checks.
5. Post issue update and set next state.

## Parallel Work Split

- research stream: docs/books/papers/case studies
- data stream: market snapshots, event history, assumptions
- risk stream: exposure, failure modes, stop-loss logic
- synthesis stream: combine findings into actionable plan

## Acceptance Gate

Accept only if output is:
- reproducible
- source-backed
- linked to issue objective
- actionable for next step

Reject and reassign if any gate fails.
