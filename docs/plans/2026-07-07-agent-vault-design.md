# Agent Vault Design

## Product Shape

Agent Vault is a local-first Electron app for preserving AI coding work across account switches, machine moves, and tool changes. The first release focuses on Codex and Claude Code because both keep useful local transcripts and both are used for long-running coding work.

The product does not try to make old provider threads appear under a new account. Instead, it creates explicit Continuation Packs that a user can review and provide to a new agent session.

## Architecture

Core logic is plain TypeScript in `src/core`. Electron main owns filesystem access and exposes a small preload API. React renders the workbench.

## Recovery Model

The safe recovery path is soft continuation:

1. Find the old session.
2. Capture transcript and repository state.
3. Generate a redacted pack.
4. Start a new session with the current account.
5. Continue from the pack.

Hard continuation through provider-private databases is intentionally out of scope.
