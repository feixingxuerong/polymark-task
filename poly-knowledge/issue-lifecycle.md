# Issue Lifecycle

Use this lifecycle for every task in the `polymark-task` repo.

## States

- `todo`: issue is open and not started
- `doing`: subagent is assigned and running
- `review`: subagent output submitted, main agent validates
- `done`: accepted and closed
- `blocked`: waiting for dependency or user decision

## Main Agent Rules

- Always pull work from open issues first.
- If no open issue can advance the goal, create a new issue.
- Keep one acceptance note per completed issue with:
  - summary
  - evidence links
  - risk notes
  - next action

## Subagent Assignment Template

Title: Subagent Task - <issue title>

Input:
- issue id
- expected output
- deadline
- quality bar

Output must include:
- what was done
- files changed
- evidence/source links
- unresolved risks
