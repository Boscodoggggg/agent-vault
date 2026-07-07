# Privacy

Agent Vault is local-first.

## What It Reads

- Codex local transcripts under `~/.codex/sessions`
- Claude Code local transcripts under `~/.claude/projects`
- Git status and diffs for recovered project paths

## What It Does Not Read

- Browser cookies
- Provider auth tokens
- `~/.codex/auth.json`
- Claude account credentials
- Remote provider APIs

## What It Writes

Continuation Packs are written under:

```text
~/Documents/Agent Vault Packs/
```

Generated packs can contain sensitive project context. Review before sharing or syncing.

## Redaction

Agent Vault redacts common OpenAI keys, GitHub tokens, bearer tokens, Google API keys, AWS access keys, and generic credential assignments.

Redaction is best effort. It is not a data loss prevention system.
