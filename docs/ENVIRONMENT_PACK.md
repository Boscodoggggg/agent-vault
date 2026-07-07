# Environment Packs

An Environment Pack preserves the portable parts of your AI agent setup so a new machine can feel familiar quickly.

It is different from a Continuation Pack:

- **Continuation Pack**: restart one old piece of work.
- **Environment Pack**: move your reusable agent setup.

## Included Assets

| Provider    | Assets                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Codex       | `~/.codex/config.toml`, `~/.codex/skills`, `~/.codex/prompts`, `~/.codex/hooks`                                                   |
| Claude Code | `~/.claude/CLAUDE.md`, `~/.claude/settings.json`, `~/.claude/commands`, `~/.claude/agents`, `~/.claude/skills`, `~/.claude/hooks` |

Only portable text files under 1 MB are included.

## Excluded Assets

Agent Vault intentionally excludes:

- auth caches
- OAuth tokens
- cookies
- `.env` files
- session transcripts
- prompt history
- machine-local settings
- folders named `sessions`, `projects`, or similar account/work-history stores

New machines should re-authenticate every provider and integration manually.

## Files

| File            | Purpose                                                     |
| --------------- | ----------------------------------------------------------- |
| `manifest.json` | Machine-readable asset list                                 |
| `README.md`     | Restore guidance                                            |
| `assets/`       | Redacted portable files, preserving original relative paths |

## Restore Guidance

1. Review `manifest.json`.
2. Inspect every file under `assets/`.
3. Copy only the assets you want to the target machine.
4. Re-authenticate Codex, Claude Code, MCP servers, GitHub, Notion, Linear, and other integrations manually.
5. Run the target agent once and verify it loads the restored skills or commands.
