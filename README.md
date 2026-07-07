# Agent Vault

[![CI](https://github.com/Boscodoggggg/agent-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/Boscodoggggg/agent-vault/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2f6f4e.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-TypeScript-b34731.svg)](https://www.electronjs.org/)
[![Local first](https://img.shields.io/badge/local--first-private-20231f.svg)](docs/PRIVACY.md)

Agent Vault is a local-first Electron app for keeping AI coding work continuous across account switches, machine moves, and tool changes.

It scans local Codex and Claude Code transcripts, normalizes sessions into one workspace, and builds **Continuation Packs** that let a fresh agent session continue the old work without pretending to be the original account.

## Why

AI coding sessions now contain design decisions, failed commands, partial fixes, and the reasoning trail behind a project. When an account changes or a machine is replaced, losing that context can turn hours of work into archaeology.

Agent Vault treats local agent history as working state, not disposable chat.

## What Works Today

- Electron + React desktop workbench
- Local Codex transcript discovery from `~/.codex/sessions`
- Local Claude Code transcript discovery from `~/.claude/projects`
- Provider-normalized project and session list
- Secret redaction for common API keys, bearer tokens, and credentials
- Continuation Pack generation:
  - `handoff.md`
  - `conversation.md`
  - `state.json`
  - `next_steps.md`
  - `verification.md`
  - `files_changed.md`
  - `git.patch`
- Git snapshot capture for branch, HEAD, status, and diff when the project path still exists

## Install From Source

```bash
git clone https://github.com/Boscodoggggg/agent-vault.git
cd agent-vault
npm install
npm run dev
```

If Electron binary download is slow in CI or a restricted network:

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install
```

## Development

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Continuation Packs

A Continuation Pack is a portable handoff bundle for a specific agent session. It is designed for the practical recovery path:

1. Open the old session in Agent Vault.
2. Build a pack.
3. Open a new Codex, Claude Code, Cursor, or other agent session.
4. Paste or attach the handoff files.
5. Continue from the preserved project state.

Agent Vault does not write into private Codex or Claude account state. It keeps the boundary explicit and recoverable.

See [Continuation Packs](docs/CONTINUATION_PACK.md).

## Supported Providers

| Provider       | Status  | Source                          |
| -------------- | ------- | ------------------------------- |
| Codex          | MVP     | `~/.codex/sessions/**/*.jsonl`  |
| Claude Code    | MVP     | `~/.claude/projects/**/*.jsonl` |
| Cursor         | Planned | local workspace storage         |
| Cline/Roo/Kilo | Planned | VS Code global storage          |
| Gemini CLI     | Planned | local CLI history               |

See [Provider Notes](docs/PROVIDERS.md).

## Privacy Model

Agent Vault reads local transcript files and writes local packs. It does not upload content, call a model, or copy authentication tokens.

Sensitive values in conversations and diffs are best-effort redacted before packs are written. You should still review a pack before sharing it.

See [Privacy](docs/PRIVACY.md) and [Security](SECURITY.md).

## Architecture

```text
Provider adapters
Codex / Claude Code / future agents
        ↓
Normalizer
sessions / messages / metadata / git state
        ↓
Electron main process
local scanning / pack writing / shell integration
        ↓
React renderer
project list / session viewer / continuation workflow
```

See [Architecture](docs/ARCHITECTURE.md).

## Roadmap

- Encrypted vault database
- Cross-machine sync using user-owned storage
- Cursor, Cline, Gemini CLI adapters
- Pack import and repo path remapping
- MCP server for asking old sessions questions
- Signed desktop releases

See [Roadmap](docs/ROADMAP.md).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then open an issue with a fixture-free description of the provider format you want to support.

## License

MIT
