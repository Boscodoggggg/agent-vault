# Architecture

Agent Vault has three layers.

## Core

The core layer lives in `src/core`.

- `scanner.ts` locates provider transcript roots.
- `providers.ts` normalizes provider-specific JSONL records.
- `redact.ts` removes common secrets before user-facing output.
- `gitSnapshot.ts` captures optional repository state.
- `continuationPack.ts` builds portable recovery artifacts.
- `environmentPack.ts` discovers portable skills, agents, commands, prompts, hooks, and redacted settings while excluding auth state.

The core layer is pure TypeScript and can later be reused by a CLI, MCP server, or VS Code extension.

## Electron Main

The main process owns filesystem access.

- Scans local provider directories.
- Caches the latest session list.
- Writes continuation packs to the user's Documents folder.
- Writes environment packs to the user's Documents folder.
- Opens generated pack folders through the operating system shell.

Renderer code never gets direct Node.js access.

## Renderer

The renderer is a React workbench for:

- Source filtering
- Session search
- Metadata inspection
- Continuation Pack generation
- Environment Pack generation
- Conversation preview

The preload bridge exposes a small typed API: `scan`, `scanEnvironment`, `writePack`, `writeEnvironmentPack`, and `openPath`.
