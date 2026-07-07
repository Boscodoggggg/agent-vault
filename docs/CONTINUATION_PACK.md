# Continuation Packs

A Continuation Pack is a local folder that turns a dead or unreachable agent session into a restartable work handoff.

## Files

| File               | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `handoff.md`       | First file to paste into a new agent session |
| `conversation.md`  | Redacted transcript in chronological order   |
| `state.json`       | Machine-readable metadata                    |
| `next_steps.md`    | Latest captured next-step context            |
| `verification.md`  | Recovery checks and captured status          |
| `files_changed.md` | Working tree file list when available        |
| `git.patch`        | Local diff when the project still exists     |

## Intended Flow

1. Review the pack locally.
2. Open the target project.
3. Start a new agent session under the current account.
4. Provide `handoff.md`, `state.json`, and relevant transcript sections.
5. Let the agent inspect the working tree before editing.

## Non-Goals

Agent Vault does not inject old sessions into provider databases, impersonate accounts, or bypass workspace policy.
