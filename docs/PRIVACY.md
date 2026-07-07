# Privacy

Agent Vault is local-first.

## What It Reads

- Codex local transcripts under `~/.codex/sessions`
- Claude Code local transcripts under `~/.claude/projects`
- Portable Codex environment assets such as `~/.codex/config.toml`, `~/.codex/skills`, `~/.codex/prompts`, and `~/.codex/hooks`
- Portable Claude Code environment assets such as `~/.claude/CLAUDE.md`, `~/.claude/settings.json`, `~/.claude/commands`, `~/.claude/agents`, `~/.claude/skills`, and `~/.claude/hooks`
- Git status and diffs for recovered project paths

## What It Does Not Read

- Browser cookies
- Provider auth tokens
- `~/.codex/auth.json`
- Claude account credentials
- Local transcript histories when building Environment Packs
- Session folders, history files, `.env` files, cookies, credentials, token files, and machine-local settings when building Environment Packs
- Remote provider APIs

## What It Writes

Continuation Packs are written under:

```text
~/Documents/Agent Vault Packs/
```

Environment Packs are written under:

```text
~/Documents/Agent Vault Environment Pack/
```

Generated packs can contain sensitive project context. Review before sharing or syncing.

## Redaction

Agent Vault redacts common OpenAI keys, GitHub tokens, bearer tokens, Google API keys, AWS access keys, and generic credential assignments.

Redaction is best effort. It is not a data loss prevention system.
